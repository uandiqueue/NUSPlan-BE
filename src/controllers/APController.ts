import { Request, Response } from 'express';
import { BackendValidator } from '../services/beValidator';
import { BackendPopulator } from '../services/bePopulator';
import type { ProcessProgrammesResponse } from '../types/shared-types';

export async function generateAcademicPlan(req: Request, res: Response): Promise<void> {
    try {
        const { programmeIds } = req.body;

        if (!programmeIds || !Array.isArray(programmeIds) || programmeIds.length === 0) {
            res.status(400).json({
                success: false,
                error: 'INVALID_REQUEST',
                message: 'programmeIds must be a non-empty array',
                details: { received: programmeIds }
            });
            return;
        }

        if (programmeIds.length > 5) {
            res.status(400).json({
                success: false,
                error: 'TOO_MANY_PROGRAMMES',
                message: 'Maximum 5 programmes allowed',
                details: { count: programmeIds.length, max: 5 }
            });
            return;
        }

        console.log(`Starting AP generation for programmes: ${programmeIds.join(', ')}`);

        // Step 1: Validate
        const validator = new BackendValidator();
        const contextService = await validator.validateProgrammes(programmeIds);

        if (contextService.hasErrors()) {
            const errors = contextService.getErrors();
            const hardErrors = errors.filter(e => e.type === 'HARD_ERROR');
            const invalidCombinations = errors.filter(e => e.type === 'INVALID_PROGRAMME_COMBINATION');

            if (hardErrors.length > 0) {
                res.status(500).json({
                    success: false,
                    error: 'INTERNAL_SERVER_ERROR',
                    message: 'Backend validation failed',
                    conflicts: hardErrors,
                    suggestion: 'Please wait and try again later or contact support',
                });
                return;
            }

            if (invalidCombinations.length > 0) {
                res.status(422).json({
                    success: false,
                    error: 'INVALID_PROGRAMME_COMBINATION',
                    message: 'Selected programmes combination is invalid',
                    conflicts: invalidCombinations,
                    suggestion: 'Please select a different combination of programmes'
                });
                return;
            }
        }

        // Step 2: Populate
        const populator = new BackendPopulator(contextService);
        const payloads = await populator.buildPayloads();

        if (payloads.length !== programmeIds.length) {
            const validationResult = populator.getValidationResult();
            res.status(500).json({
                success: false,
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Populator failed to generate AP',
                validationErrors: validationResult.errors,
                details: validationResult.summary,
                contextStats: validationResult.contextStats,
                fullContext: validationResult.fullContext
            });
            return;
        }

        // Step 3: Success
        const validationResult = populator.getValidationResult();

        res.status(200).json({
            success: true,
            data: {
                programmes: payloads,
                globalValidation: {
                    isValid: validationResult.isValid,
                    errors: validationResult.errors
                }
            } as ProcessProgrammesResponse,
            metadata: {
                programmeCount: payloads.length,
                generatedAt: new Date().toISOString(),
                processingStats: contextService.getProcessingStats()
            }
        });

    } catch (error) {
        console.error('Error in generateAcademicPlan:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred during AP generation',
            details: error instanceof Error
                ? { name: error.name, message: error.message }
                : { error: String(error) }
        });
    }
}

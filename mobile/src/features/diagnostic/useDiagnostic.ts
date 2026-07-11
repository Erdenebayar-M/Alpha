import { useMutation } from '@tanstack/react-query';

import {
  startDiagnostic,
  submitDiagnostic,
  type SubmitDiagnosticInput,
} from '@/src/api/diagnostic';

export function useStartDiagnostic() {
  return useMutation({
    mutationFn: (learnerId: string) => startDiagnostic(learnerId),
  });
}

export function useSubmitDiagnostic() {
  return useMutation({
    mutationFn: (input: SubmitDiagnosticInput) => submitDiagnostic(input),
  });
}

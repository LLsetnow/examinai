const activeJobs = new Set<string>();
const failedJobs = new Map<string, string>();

const FAILED_JOB_TTL_MS = 15 * 60 * 1000;

export function isBackgroundJobActive(jobId: string) {
  return activeJobs.has(jobId);
}

export function startBackgroundJob(jobId: string) {
  activeJobs.add(jobId);
  failedJobs.delete(jobId);
}

export function completeBackgroundJob(jobId: string) {
  activeJobs.delete(jobId);
  failedJobs.delete(jobId);
}

export function failBackgroundJob(jobId: string, message: string) {
  activeJobs.delete(jobId);
  failedJobs.set(jobId, message);
  setTimeout(() => {
    failedJobs.delete(jobId);
  }, FAILED_JOB_TTL_MS).unref?.();
}

export function getBackgroundJobError(jobId: string) {
  return failedJobs.get(jobId) ?? null;
}

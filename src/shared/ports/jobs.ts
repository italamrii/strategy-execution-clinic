export type Job<T> = {
  name: string;
  payload: T;
};

export type JobQueue = {
  enqueue<T>(job: Job<T>): Promise<void>;
};

export const inProcessQueue: JobQueue = {
  async enqueue(job) {
    console.info("jobs.enqueue", { name: job.name });
  },
};

export class SutBoundaryValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SutBoundaryValidationError";
  }
}

export class SutReferenceError extends Error {
  constructor(reference) {
    super(`Unknown or closed SUT run/reference: ${reference}.`);
    this.name = "SutReferenceError";
  }
}

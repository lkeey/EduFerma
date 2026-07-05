export class SetupRequiredError extends Error {
  readonly code = "SETUP_REQUIRED";

  constructor(message = "Remote database is not configured") {
    super(message);
    this.name = "SetupRequiredError";
  }
}

export class ServiceForbiddenError extends Error {
  readonly code = "FORBIDDEN";

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ServiceForbiddenError";
  }
}

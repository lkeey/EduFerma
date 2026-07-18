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

export class ServiceConflictError extends Error {
  readonly code = "CONFLICT";

  constructor(message = "The requested mutation conflicts with current state") {
    super(message);
    this.name = "ServiceConflictError";
  }
}

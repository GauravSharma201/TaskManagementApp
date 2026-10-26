export enum EventTypes {
  userCreated = 'user.created',
  forgotPassword = 'user.forgotPassword',
  emailVerification = 'user.emailVerification'
}

export enum ConsumeOutcome {
  Ack = 'acknowledged',
  RETRY = 'retry',
  REJECT = 'rejected',
  Nack = 'nack',
  PauseConsuming = 'pause-consuming'
}

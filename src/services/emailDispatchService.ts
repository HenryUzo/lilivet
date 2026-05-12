type BackgroundEmailDispatchInput = {
  requestId: string;
  requestType: "appointment" | "new_patient";
  notificationType: "clinic" | "client";
  task: () => Promise<void>;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function dispatchBackgroundEmail(input: BackgroundEmailDispatchInput) {
  void input.task().catch((error) => {
    console.error(
      JSON.stringify({
        event: "email_dispatch_failed",
        requestId: input.requestId,
        requestType: input.requestType,
        notificationType: input.notificationType,
        error: getErrorMessage(error)
      })
    );
  });
}

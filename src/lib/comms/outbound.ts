import type {
  ElevatesStore,
  OutboundChannel,
  OutboundMessage,
  OutboundTemplateKey,
  Profile,
} from "@/types";

export function waAddress(profile: Profile | undefined, userId: string): string {
  if (profile?.phone?.trim()) {
    const digits = profile.phone.replace(/\D/g, "");
    return digits ? `+${digits}` : `demo-wa:${userId}`;
  }
  return `demo-wa:${userId}`;
}

export function buildOutboundBody(
  templateKey: OutboundTemplateKey,
  vars: { name?: string; eventTitle?: string; ticketNo?: string; extra?: string },
): { title: string; body: string } {
  const name = vars.name || "there";
  const event = vars.eventTitle || "your event";
  if (templateKey === "registration_approved") {
    return {
      title: `You're in — ${event}`,
      body: `Hi ${name}, your registration for ${event} was approved.${
        vars.ticketNo ? ` Ticket ${vars.ticketNo}.` : ""
      } Bring your QR at check-in.`,
    };
  }
  if (templateKey === "registration_waitlisted") {
    return {
      title: `Waitlisted — ${event}`,
      body: `Hi ${name}, ${event} is at capacity. You're on the waitlist — we'll notify you if a seat opens.`,
    };
  }
  if (templateKey === "event_reminder") {
    return {
      title: `Reminder — ${event}`,
      body: `Hi ${name}, ${event} is coming up soon. ${vars.extra ?? "See you there."}`,
    };
  }
  return {
    title: vars.extra || "Elevates update",
    body: vars.extra || "You have a new announcement in Elevates.",
  };
}

export function queueOutbound(input: {
  channel: OutboundChannel;
  toUserId: string;
  toAddress: string;
  templateKey: OutboundTemplateKey;
  title: string;
  body: string;
  relatedEntity?: string;
  relatedId?: string;
}): OutboundMessage {
  return {
    id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    channel: input.channel,
    toUserId: input.toUserId,
    toAddress: input.toAddress,
    templateKey: input.templateKey,
    title: input.title,
    body: input.body,
    status: "sent",
    relatedEntity: input.relatedEntity,
    relatedId: input.relatedId,
    createdAt: new Date().toISOString(),
  };
}

/** Demo: email + WhatsApp rows for a registration decision. */
export function outboundForRegistration(
  store: ElevatesStore,
  reg: { id: string; userId: string; eventId: string; ticketNo?: string },
  status: "approved" | "waitlisted",
): OutboundMessage[] {
  const profile = store.profiles.find((p) => p.id === reg.userId);
  const event = store.events.find((e) => e.id === reg.eventId);
  const templateKey =
    status === "approved" ? "registration_approved" : "registration_waitlisted";
  const { title, body } = buildOutboundBody(templateKey, {
    name: profile?.fullName,
    eventTitle: event?.title,
    ticketNo: reg.ticketNo,
  });
  const chapter = event
    ? store.chapters.find((c) => c.id === event.chapterId)
    : undefined;
  const href = chapter
    ? `/chapter/${chapter.slug}/events/${event!.id}`
    : undefined;
  void href;

  return [
    queueOutbound({
      channel: "email",
      toUserId: reg.userId,
      toAddress: profile?.email || `user-${reg.userId}@elevates.live`,
      templateKey,
      title,
      body,
      relatedEntity: "registration",
      relatedId: reg.id,
    }),
    queueOutbound({
      channel: "whatsapp",
      toUserId: reg.userId,
      toAddress: waAddress(profile, reg.userId),
      templateKey,
      title,
      body,
      relatedEntity: "registration",
      relatedId: reg.id,
    }),
  ];
}

export function outboundEventReminders(
  store: ElevatesStore,
  eventId: string,
): OutboundMessage[] {
  const event = store.events.find((e) => e.id === eventId);
  if (!event) return [];
  const approved = store.registrations.filter(
    (r) => r.eventId === eventId && r.status === "approved",
  );
  const out: OutboundMessage[] = [];
  for (const reg of approved) {
    const profile = store.profiles.find((p) => p.id === reg.userId);
    const { title, body } = buildOutboundBody("event_reminder", {
      name: profile?.fullName,
      eventTitle: event.title,
      extra: event.venue ? `Venue: ${event.venue}.` : undefined,
    });
    out.push(
      queueOutbound({
        channel: "email",
        toUserId: reg.userId,
        toAddress: profile?.email || `user-${reg.userId}@elevates.live`,
        templateKey: "event_reminder",
        title,
        body,
        relatedEntity: "event",
        relatedId: eventId,
      }),
      queueOutbound({
        channel: "whatsapp",
        toUserId: reg.userId,
        toAddress: waAddress(profile, reg.userId),
        templateKey: "event_reminder",
        title,
        body,
        relatedEntity: "event",
        relatedId: eventId,
      }),
    );
  }
  return out;
}

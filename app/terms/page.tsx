import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of service — 5number",
  description: "The rules for using 5number.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="30 August 2026">
      <p className="text-[15px] leading-relaxed text-foreground">
        These terms govern your use of 5number. By creating an account you agree to them. If you
        don&apos;t, please don&apos;t use the service.
      </p>

      <Section heading="What the service is">
        <p>
          5number sells access to temporary and rented virtual phone numbers for receiving SMS
          verification codes. An activation gives you one number for one service until a code
          arrives. A rental gives you a number for a fixed period during which you can receive
          multiple messages.
        </p>
        <p>
          Numbers are supplied to us by a third-party provider. Availability, pricing and coverage
          depend on that provider and change constantly.
        </p>
      </Section>

      <Section heading="Your account">
        <p>
          You must be at least 18 to use 5number. You are responsible for keeping your password
          secure and for everything done through your account. Tell us promptly if you believe
          someone else has access to it.
        </p>
        <p>One person or business, one account. Don&apos;t create accounts to evade limits or bans.</p>
      </Section>

      <Section heading="Acceptable use">
        <p>You agree not to use 5number to:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Impersonate another person or misrepresent who you are</li>
          <li>Commit fraud, or create accounts intended to defraud a service or its users</li>
          <li>Evade a ban, suspension or other enforcement by another platform</li>
          <li>Send or solicit spam, or run bulk automated account creation</li>
          <li>Break the terms of the service you are verifying against</li>
          <li>Do anything illegal under the laws that apply to you</li>
        </ul>
        <p>
          Numbers are for verifying accounts you legitimately own or are authorised to create. We
          may suspend or close accounts we believe are being used otherwise, and we may withhold
          the balance of an account closed for fraud.
        </p>
      </Section>

      <Section heading="Payments and your balance">
        <p>
          You fund your wallet in advance and spend from that balance. Your balance is denominated
          in US dollars. Payments are taken in your local currency by our payment processor, and
          your bank&apos;s conversion rate applies.
        </p>
        <p>
          Your balance is credit for the service. It is not a bank deposit, it earns no interest,
          and it is not transferable to another user.
        </p>
      </Section>

      <Section heading="Refunds">
        <p>
          If an activation number never receives a code, you are not charged for it — cancel the
          order and the amount stays in your wallet.
        </p>
        <p>
          Once a code has been delivered, that order is complete and is not refundable. Rentals are
          not refundable for time already elapsed, and we can&apos;t refund because a service
          rejected a number, since we can&apos;t control another platform&apos;s rules.
        </p>
        <p>Wallet top-ups are generally non-refundable once credited.</p>
      </Section>

      <Section heading="No guarantee of delivery or acceptance">
        <p>
          SMS delivery depends on mobile networks and on the service sending the message. We cannot
          guarantee a particular message will arrive, that a particular service will accept our
          numbers, or that stock will be available for any country or service at a given moment.
        </p>
      </Section>

      <Section heading="Numbers are temporary and shared">
        <p>
          Numbers are recycled. After your order ends, a number may be issued to someone else, who
          could then receive messages sent to it. Never use our numbers for banking, government
          services, email account recovery, or anything else you need long-term or exclusive
          control over. Any loss arising from doing so is your responsibility.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          We aim to keep the service running but do not promise uninterrupted availability.
          Maintenance, provider outages and factors outside our control can interrupt it.
        </p>
      </Section>

      <Section heading="Limitation of liability">
        <p>
          To the fullest extent the law allows, 5number is not liable for indirect or consequential
          loss, lost profits, or loss of data arising from your use of the service. Our total
          liability to you is limited to the amount you have paid us in the three months before the
          event giving rise to the claim.
        </p>
        <p>Nothing here limits liability that cannot be limited by law.</p>
      </Section>

      <Section heading="Suspension and closure">
        <p>
          We may suspend or close an account that breaches these terms. You can stop using the
          service at any time and ask us to close your account; any remaining balance on a closed
          account is handled case by case, and we won&apos;t refund a balance where closure follows
          fraud or abuse.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          We may update these terms as the service develops. The date at the top shows the current
          version, and continuing to use 5number after a change means you accept it.
        </p>
      </Section>
    </LegalPage>
  );
}

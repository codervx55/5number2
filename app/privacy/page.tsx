import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy — 5number",
  description: "How 5number collects, uses and stores your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="30 August 2026">
      <p className="text-[15px] leading-relaxed text-foreground">
        This policy explains what information 5number collects when you use the service, why we
        collect it, how long we keep it, and what you can ask us to do with it.
      </p>

      <Section heading="Who we are">
        <p>
          5number provides temporary and rented virtual phone numbers used to receive SMS
          verification codes. In this policy, &ldquo;we&rdquo; and &ldquo;us&rdquo; mean 5number,
          and &ldquo;you&rdquo; means anyone using the service.
        </p>
        <p>
          For questions about this policy or about your data, contact us through the details on our
          website.
        </p>
      </Section>

      <Section heading="What we collect">
        <p>
          <strong className="text-foreground">Account information.</strong> Your email address and a
          password, which is stored in hashed form by our authentication provider and is never
          visible to us in plain text.
        </p>
        <p>
          <strong className="text-foreground">Transaction records.</strong> Your wallet balance, top-ups,
          and a record of every number you buy or rent — the service, country, price and time.
        </p>
        <p>
          <strong className="text-foreground">SMS content.</strong> Messages received on numbers you have
          bought or rented pass through our systems so we can show them to you. We store them so
          your order history is complete.
        </p>
        <p>
          <strong className="text-foreground">Technical information.</strong> Standard server logs
          including IP address, browser type and timestamps, used for security and to diagnose
          faults.
        </p>
        <p>
          We do not collect your name, physical address, or government identification, and we do not
          ask for them.
        </p>
      </Section>

      <Section heading="Payment information">
        <p>
          Card numbers and bank details are never sent to or stored on our servers. Payments are
          processed by Paystack, who handle your payment details directly under their own privacy
          policy. We receive only a confirmation that a payment succeeded, the amount, and a
          reference so we can credit your wallet.
        </p>
      </Section>

      <Section heading="How we use it">
        <p>We use the information above only to:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Provide the service — issuing numbers and delivering the messages they receive</li>
          <li>Maintain your wallet balance and order history</li>
          <li>Detect and prevent fraud, abuse and unauthorised access</li>
          <li>Respond to your support requests</li>
          <li>Meet legal obligations where they apply to us</li>
        </ul>
        <p>
          We do not sell your information, and we do not share it with advertisers or data brokers.
        </p>
      </Section>

      <Section heading="Who we share it with">
        <p>
          We share the minimum necessary with the providers who make the service work: our SMS
          number supplier (to issue numbers and retrieve messages), our payment processor (to take
          payments), our hosting and database providers (to run the service), and our email provider
          (to send verification codes). Each processes data on our behalf.
        </p>
        <p>
          We may disclose information where we are legally required to, such as a valid order from a
          competent authority.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          Account and transaction records are kept for as long as your account exists, and for a
          period afterwards where needed for accounting, dispute resolution or legal obligations.
        </p>
        <p>
          Message content associated with an order is kept with that order&apos;s history. If you
          would like specific messages deleted sooner, contact us and we will remove them where we
          are not required to retain them.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          Depending on where you live, you may have the right to access the information we hold
          about you, correct it if it is wrong, ask for it to be deleted, object to certain
          processing, or receive a copy in a portable format.
        </p>
        <p>
          To exercise any of these, contact us. We may need to verify that the request comes from
          the account holder before acting on it.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          Data is transmitted over encrypted connections and stored with access controls limiting
          who can reach it. Passwords are hashed by our authentication provider. No system is
          perfectly secure, so please use a strong, unique password and tell us promptly if you
          suspect unauthorised access to your account.
        </p>
      </Section>

      <Section heading="Numbers are shared and temporary">
        <p>
          This matters more than anything else in this policy, so please read it carefully. The
          numbers we provide are temporary and may be reissued to another customer after your
          order ends. Anyone who later holds that number could receive messages sent to it.
        </p>
        <p>
          For that reason, do not use our numbers for anything you need permanent or exclusive
          control over — bank accounts, government services, primary email recovery, or any account
          holding money or sensitive personal data. Treat every number as disposable.
        </p>
      </Section>

      <Section heading="Cookies">
        <p>
          We use cookies that are necessary for the service to function, principally to keep you
          signed in. We do not use advertising or third-party tracking cookies.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          The service is not intended for anyone under 18, and we do not knowingly collect
          information from children. If you believe a child has created an account, contact us and
          we will remove it.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          We may update this policy as the service changes. The date at the top shows when it was
          last revised, and material changes will be signposted in the product.
        </p>
      </Section>
    </LegalPage>
  );
}

import LegalLayout, { H2, P, UL, LI, Callout, ContactBlock } from '../components/legal/LegalLayout';
import {
  POLICY_UPDATED, PRIVACY_CONTACT_EMAIL,
  LEGAL_ENTITY, LEGAL_JURISDICTION,
} from '../siteConfig';

export default function Terms() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of Service"
      updated={POLICY_UPDATED}
      summary={`The agreement between your organization and ${LEGAL_ENTITY} for use of the ChefCode product.`}
    >
      <P>
        These terms apply when your organization uses ChefCode. By creating an account or using the
        product you agree to them on behalf of your organization. If you are signing up for an
        employer, you confirm you are authorised to accept these terms for them.
      </P>

      <H2 id="service">1. What the service is</H2>
      <P>
        ChefCode reads supplier invoices you upload, extracts the line items, assigns GL codes from
        the chart of accounts and product list you configure, flags price changes, and lets you
        review, approve and export the result. It is a tool that produces a draft for a human to
        check. It is not an accountant, an auditor or a bookkeeper.
      </P>

      <H2 id="accuracy">2. Accuracy, and your obligation to review</H2>
      <Callout>
        <strong>Every invoice ChefCode codes must be reviewed by a person before you rely on it.</strong>{' '}
        The product is built around a review step for exactly this reason. Automated extraction is
        very good and it is not perfect — it can misread a smudged line, misassign a code for a
        product it has not seen, or transcribe a number incorrectly.
      </Callout>
      <P>
        You are responsible for the accuracy of the figures you approve, export, submit to your
        accounting system, or rely on for payment, tax or audit purposes. We provide the draft; the
        decision to accept it is yours. We are not liable for losses arising from figures you
        approved without checking them.
      </P>
      <P>
        Any accuracy figures we publish describe typical performance in our own testing. They are
        not a warranty, and they do not apply to any particular invoice.
      </P>

      <H2 id="accounts">3. Accounts and your team</H2>
      <UL>
        <LI>The person who creates the organization becomes its Owner and can invite others.</LI>
        <LI>Each team member has a role — Owner, Manager, Chef or Viewer — which determines their access. Choosing appropriate roles is your responsibility.</LI>
        <LI>You are responsible for keeping credentials secure and for activity under your accounts. Tell us promptly if you believe an account has been compromised.</LI>
        <LI>Accounts are for named individuals. Do not share one login across a team.</LI>
      </UL>

      <H2 id="trial-billing">4. Trial and billing</H2>
      <UL>
        <LI>New organizations get a 15-day free trial. No card is required to start it.</LI>
        <LI>When the trial ends, the account becomes read-only until you move to a paid plan. Your data is not deleted when a trial expires.</LI>
        <LI>Fees, limits and billing period are those of the plan agreed with you in writing. Plans are billed in advance.</LI>
        <LI>Fees are non-refundable except where required by law, or where we have failed to provide the service and cannot put it right.</LI>
        <LI>We will give at least 30 days' notice before a price change affecting you, and it will not take effect before your next renewal.</LI>
      </UL>

      <H2 id="your-data">5. Your data belongs to you</H2>
      <P>
        You keep all rights to the data you put into ChefCode — your invoices, vendors, products, GL
        codes and locations. We claim no ownership of it. We use it only to provide the service to
        you, as described in our{' '}
        <a className="text-brand-600 font-medium underline hover:text-brand-700" href="/privacy">Privacy Policy</a>.
      </P>
      <P>
        We do not use your business data to train AI models. You can export your data from inside
        the product at any time, and you can ask us to delete it.
      </P>

      <H2 id="acceptable-use">6. Acceptable use</H2>
      <P>Do not:</P>
      <UL>
        <LI>Upload documents you do not have the right to process</LI>
        <LI>Upload material containing sensitive personal data — health records, government identifiers, or payment card numbers. ChefCode is built for supplier invoices and is not designed to hold those.</LI>
        <LI>Attempt to access another organization's data, probe the service for vulnerabilities without our written permission, or interfere with its operation</LI>
        <LI>Resell or white-label the service without an agreement with us</LI>
        <LI>Use the service to break the law</LI>
      </UL>
      <P>
        If you find a security vulnerability, report it to us. We will not pursue anyone who
        investigates in good faith, tells us privately, and gives us a reasonable chance to fix it
        before saying anything publicly.
      </P>

      <H2 id="availability">7. Availability</H2>
      <P>
        We work to keep ChefCode available and will give notice of planned maintenance where we
        reasonably can. We do not commit to a specific uptime percentage on our standard plans. If
        your organization needs a contractual service level, that belongs in an enterprise agreement
        — talk to us and we will put one in writing rather than leave you relying on a page like
        this one.
      </P>
      <P>
        The service depends on third-party providers, including our hosting, database and AI
        providers. An outage at one of those can interrupt ChefCode.
      </P>

      <H2 id="termination">8. Ending the agreement</H2>
      <UL>
        <LI>You can stop using ChefCode and close your account at any time.</LI>
        <LI>We may suspend or close an account that breaches these terms, that is used unlawfully, or where fees are substantially overdue. Except for serious misuse, we will tell you and give you a chance to fix the problem first.</LI>
        <LI>Export your data before you close your account. On request after closure we will delete your organization's data within 30 days.</LI>
      </UL>

      <H2 id="warranty">9. Warranties</H2>
      <P>
        We provide ChefCode with reasonable care and skill. Beyond that, and to the extent the law
        allows, the service is provided as is, without implied warranties of merchantability,
        fitness for a particular purpose, or non-infringement. We do not warrant that the service
        will be uninterrupted or error-free, or that automated coding will be accurate in every
        case.
      </P>

      <H2 id="liability">10. Limitation of liability</H2>
      <P>
        To the extent permitted by law, neither party is liable for indirect, incidental, special or
        consequential losses, or for lost profits, revenue, goodwill or data, even if advised such
        losses were possible.
      </P>
      <P>
        Our total liability for any claim arising out of or relating to these terms is limited to
        the fees you paid us in the 12 months before the event giving rise to the claim.
      </P>
      <P>
        Nothing here limits liability that cannot be limited by law, including for fraud or for
        death or personal injury caused by negligence.
      </P>

      <H2 id="changes">11. Changes to these terms</H2>
      <P>
        We may update these terms. The date at the top of this page shows the current version. For a
        material change we will notify account owners directly and, where it affects a paid plan,
        the change takes effect at your next renewal.
      </P>

      <H2 id="law">12. Governing law</H2>
      <P>
        These terms are governed by the laws of {LEGAL_JURISDICTION}, without regard to its conflict
        of laws rules. The courts located there have exclusive jurisdiction, except that either
        party may seek injunctive relief wherever appropriate.
      </P>

      <H2 id="contact">13. Contact</H2>
      <P>
        Questions about these terms, or want an enterprise agreement with a negotiated service level
        and a signed DPA? Get in touch.
      </P>
      <ContactBlock email={PRIVACY_CONTACT_EMAIL} subject="Question about the Terms" />
    </LegalLayout>
  );
}

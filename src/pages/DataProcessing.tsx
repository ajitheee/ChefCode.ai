import LegalLayout, { H2, P, UL, LI, Callout, Table, ContactBlock } from '../components/legal/LegalLayout';
import { POLICY_UPDATED, PRIVACY_CONTACT_EMAIL, LEGAL_ENTITY } from '../siteConfig';

export default function DataProcessing() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Data Processing"
      updated={POLICY_UPDATED}
      summary={`The processor terms that apply when ${LEGAL_ENTITY} handles data on your organization's behalf, and the full list of sub-processors.`}
    >
      <P>
        When your organization uses ChefCode, you are the controller of the business data you put
        in, and we are your processor. This page sets out how we act in that role. It is written to
        stand on its own, and we will also sign your own DPA if your procurement process requires
        one on your paper.
      </P>

      <H2 id="scope">1. Scope and roles</H2>
      <UL>
        <LI><strong>You are the controller</strong> of the invoice, vendor, product and GL data you load into ChefCode, and of the team member records you create.</LI>
        <LI><strong>We are the processor</strong> of that data. We process it only to provide the service, and only on your documented instructions — your use of the product's features is that instruction.</LI>
        <LI><strong>We are a controller</strong> in our own right for a narrow set of account administration data: the email address used to sign in, and billing correspondence.</LI>
      </UL>

      <H2 id="categories">2. What is processed</H2>
      <Table
        head={['Category', 'Detail', 'Data subjects']}
        rows={[
          ['Account data', 'Name, email, role, organization and location assignment', 'Your employees who use ChefCode'],
          ['Invoice data', 'Vendor, invoice number, date, totals, delivery address, line items, GL codes', 'Not personal data in normal use'],
          ['Configuration', 'Locations, GL codes, vendors, product list', 'Not personal data'],
          ['Technical data', 'IP address and standard request metadata when the site is loaded', 'Your employees who use ChefCode'],
        ]}
      />
      <Callout>
        ChefCode is designed so that no special-category data is involved. Supplier invoices are
        commercial records. If your invoices routinely contain personal data beyond a delivery
        address and a signatory name, tell us before you start — that is not the shape of data the
        product expects.
      </Callout>

      <H2 id="duration">3. Duration</H2>
      <P>
        We process your data for as long as your account is open. On closure, and on request, we
        delete your organization's data within 30 days. Uploaded invoice images are not retained at
        any point.
      </P>

      <H2 id="subprocessors">4. Sub-processors</H2>
      <P>
        These are every third party that processes data on our behalf. We will give notice before
        adding a new one, and you may object.
      </P>
      <Table
        head={['Sub-processor', 'Purpose', 'Data processed', 'Location']}
        rows={[
          ['Supabase', 'Managed database and authentication', 'All stored account and business data', 'United States (AWS)'],
          ['Google LLC', 'Invoice text extraction (Gemini API)', 'The uploaded invoice, plus the GL codes and location names and addresses used to read it', 'United States'],
          ['Vercel', 'Application hosting, CDN, and the server function that relays invoices for reading', 'Request metadata including IP address; uploaded invoices in transit, not stored', 'Global edge, United States origin'],
          ['Google LLC', 'Web font delivery', 'IP address at page load', 'Global edge'],
          ['Unsplash', 'Image delivery on the sign-in screen', 'IP address when the sign-in screen loads', 'Global edge'],
        ]}
      />

      <H2 id="security">5. Security measures</H2>
      <P>
        We maintain the technical and organisational measures described on the{' '}
        <a className="text-brand-600 font-medium underline hover:text-brand-700" href="/security">Security Overview</a> page.
        In summary: TLS on every connection, encryption at rest, database-enforced row-level tenant
        isolation, role-based access control, and no retention of uploaded documents. That page also
        states plainly which controls are not yet implemented.
      </P>

      <H2 id="confidentiality">6. Confidentiality and personnel</H2>
      <P>
        Access to production data is limited to the people who need it to operate and support the
        service, and they are bound by confidentiality obligations. ChefCode is operated by a small
        team, so that set of people is correspondingly small.
      </P>

      <H2 id="assistance">7. Assistance to you</H2>
      <UL>
        <LI><strong>Data subject requests:</strong> you can access, correct, export and delete records directly in the product. Where you need our help to respond to a request, we will provide it.</LI>
        <LI><strong>Breach notification:</strong> we will notify you without undue delay, and within 72 hours of confirming a personal data breach affecting your data.</LI>
        <LI><strong>Impact assessments:</strong> we will provide the information you reasonably need for a DPIA or a vendor security review.</LI>
        <LI><strong>Audit:</strong> we will answer security questionnaires and make our documentation available. For an enterprise agreement we can discuss additional audit rights.</LI>
      </UL>

      <H2 id="transfers">8. International transfers</H2>
      <P>
        Processing takes place in the United States. If you are transferring personal data from the
        EEA, the UK or Switzerland, that transfer relies on the Standard Contractual Clauses, which
        we will enter into with you on request.
      </P>

      <H2 id="deletion">9. Return and deletion</H2>
      <P>
        You can export your data yourself at any time, in CSV or PDF, without asking us. On
        termination we delete your organization's data within 30 days of request. Backups taken
        before deletion expire on our provider's normal backup cycle.
      </P>

      <H2 id="contact">10. Requesting a signed DPA</H2>
      <P>
        If your procurement process needs a signed agreement — ours or yours — get in touch and we
        will turn it around quickly. We would rather sign your paper than argue about whose template
        to use.
      </P>
      <ContactBlock email={PRIVACY_CONTACT_EMAIL} subject="DPA request" />
    </LegalLayout>
  );
}

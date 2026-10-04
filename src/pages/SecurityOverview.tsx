import LegalLayout, { H2, H3, P, UL, LI, Callout, Table, ContactBlock } from '../components/legal/LegalLayout';
import { POLICY_UPDATED, PRIVACY_CONTACT_EMAIL } from '../siteConfig';

export default function SecurityOverview() {
  return (
    <LegalLayout
      eyebrow="Trust"
      title="Security Overview"
      updated={POLICY_UPDATED}
      summary="How ChefCode is built, what protects your data, and what we have not built yet. Written for the person doing your security review — use the Save as PDF button to attach it to a file."
    >
      <Callout>
        This document states what is true today, including where we fall short of what a larger
        vendor would offer. If you find a claim here you cannot verify, tell us — we would rather
        correct this page than have it quietly fail your review.
      </Callout>

      <H2 id="architecture">Architecture</H2>
      <P>
        ChefCode is a browser application backed by a managed Postgres database. There is no
        self-managed server infrastructure to patch and no on-premise component to install. The
        application is served as static assets from a CDN, and it talks directly to the database
        provider's API over TLS.
      </P>
      <Table
        head={['Layer', 'Provider', 'Notes']}
        rows={[
          ['Database and authentication', 'Supabase', 'Managed Postgres on AWS. SOC 2 Type II certified.'],
          ['Application hosting', 'Vercel', 'Static assets over a global CDN, TLS terminated at the edge.'],
          ['Invoice text extraction', 'Google Gemini API', 'Called directly from the browser at upload time.'],
        ]}
      />
      <P>
        ChefCode itself is not SOC 2 certified. Our infrastructure providers are. We state this
        plainly because the distinction matters to an auditor and we are not going to blur it.
      </P>

      <H2 id="isolation">Tenant isolation</H2>
      <P>
        This is the control that matters most for a multi-tenant system, so it is enforced at the
        lowest level we can reach.
      </P>
      <UL>
        <LI>Every table carries an organization identifier and has row-level security enabled in Postgres.</LI>
        <LI>Policies resolve the signed-in user's organization from their profile and restrict every read and write to that organization's rows.</LI>
        <LI>Because the restriction lives in the database rather than in application code, a bug in the front end cannot expose another customer's data. The database refuses the query.</LI>
        <LI>The browser only ever holds a public anonymous key, which has no privileges of its own. All access is scoped by the authenticated session.</LI>
      </UL>
      <P>
        You can verify this yourself during an evaluation: request a second trial organization and
        confirm neither can see the other's invoices, products or GL codes.
      </P>

      <H2 id="encryption">Encryption</H2>
      <UL>
        <LI><strong>In transit:</strong> TLS on every connection — browser to CDN, browser to database, browser to the extraction API. No unencrypted channel exists.</LI>
        <LI><strong>At rest:</strong> our database provider encrypts stored data at rest on AWS infrastructure.</LI>
      </UL>

      <H2 id="data-handling">What we store, and what we deliberately do not</H2>
      <Callout>
        <strong>Uploaded invoice images and PDFs are never stored.</strong> The document is sent for
        extraction, the structured result is saved, and the file itself is never written to our
        database or to file storage. There is no repository of scanned documents.
      </Callout>
      <P>We store:</P>
      <UL>
        <LI>Invoice records — vendor, invoice number, date, total, delivery address, status</LI>
        <LI>Line items — description, product number, quantity, unit price, total, assigned GL code</LI>
        <LI>Your configuration — locations, GL codes, vendors, products</LI>
        <LI>Account records — name, email, role, organization and location assignment</LI>
      </UL>
      <P>We do not store:</P>
      <UL>
        <LI>Invoice images or PDFs</LI>
        <LI>Payment card data — we never collect it</LI>
        <LI>Student records of any kind</LI>
        <LI>Plain-text passwords — authentication is handled by our provider and passwords are hashed</LI>
      </UL>

      <H2 id="access">Access control</H2>
      <P>
        Four roles, assigned per user, enforced in the database alongside the tenant boundary:
      </P>
      <Table
        head={['Role', 'Intended for', 'Scope']}
        rows={[
          ['Owner', 'The person accountable for the account', 'Full access, including team and billing'],
          ['Manager', 'Kitchen or unit management', 'Full operational access to assigned locations'],
          ['Chef', 'Day-to-day invoice processing', 'Upload, code and review invoices'],
          ['Viewer', 'Controllers, auditors, finance', 'Read-only'],
        ]}
      />
      <P>
        Users can be restricted to a single location, so a chef at one property does not see another
        property's invoices.
      </P>

      <H2 id="ai">Third-party AI processing</H2>
      <P>
        Reading an invoice requires sending the uploaded document to Google's Gemini API. The
        request goes directly from the user's browser to Google and contains the document and the
        extraction instructions — no account names, email addresses or organization details are
        included. We do not use customer data to train models, and we do not operate any model of
        our own on your data.
      </P>
      <P>
        If your institution's policy prohibits sending supplier documents to a third-party AI
        provider, raise it with us at evaluation rather than after signature. It is a solvable
        constraint, but it changes the deployment.
      </P>

      <H2 id="logging">Logging and traceability — current state</H2>
      <P>
        Today ChefCode records, for every row: who created it where that applies, which user
        processed a given invoice, and creation and last-modified timestamps. That gives you
        record-level attribution — you can tell who processed an invoice and when it last changed.
      </P>
      <Callout>
        <strong>Field-level change history is not implemented yet.</strong> The schema reserves a
        table for it, but ChefCode does not currently write a before-and-after record of every edit.
        If your review requires a full immutable audit log, it is on the roadmap and not in the
        product today — we would rather tell you that now than have it surface in a questionnaire.
      </Callout>

      <H2 id="ferpa">FERPA</H2>
      <P>
        ChefCode processes supplier invoices — what a kitchen bought, from whom, at what price. It
        has no access to student information systems, enrolment data, meal-plan accounts or any
        other education record, and it never receives student personally identifiable information.
        For a university dining operation, ChefCode sits entirely on the procurement side.
      </P>

      <H2 id="availability">Availability and continuity</H2>
      <UL>
        <LI>The database provider performs automated backups of the managed Postgres instance.</LI>
        <LI>Application hosting is served from a global CDN with no single regional dependency for static assets.</LI>
        <LI>We do not offer a contractual uptime commitment on standard plans. Enterprise agreements can include one — ask.</LI>
      </UL>

      <H2 id="incident">Incident response</H2>
      <P>
        ChefCode is operated by a small team, which means there is no escalation maze: a report
        reaches the person who can fix it immediately. If we become aware of a breach affecting your
        data we will notify affected account owners without undue delay, and in any event within 72
        hours of confirming it, with what we know, what we are doing, and what you should do.
      </P>

      <H2 id="disclosure">Reporting a vulnerability</H2>
      <P>
        If you find a security issue, tell us privately and give us a reasonable chance to fix it
        before disclosing publicly. We will not pursue legal action against anyone acting in good
        faith, and we will credit you if you want the credit.
      </P>

      <H2 id="questions">Security questions and reviews</H2>
      <P>
        We will complete your security questionnaire, sign a DPA, and talk directly to your IT or
        compliance team. See the{' '}
        <a className="text-brand-600 font-medium underline hover:text-brand-700" href="/dpa">Data Processing</a> page for
        processor terms and the sub-processor list.
      </P>
      <ContactBlock email={PRIVACY_CONTACT_EMAIL} subject="Security review" />
    </LegalLayout>
  );
}

import LegalLayout, { H2, H3, P, UL, LI, Callout, Table, ContactBlock } from '../components/legal/LegalLayout';
import { POLICY_UPDATED, PRIVACY_CONTACT_EMAIL, LEGAL_ENTITY } from '../siteConfig';

export default function Privacy() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      updated={POLICY_UPDATED}
      summary={`How ${LEGAL_ENTITY} handles your data — what we collect, where it goes, who else touches it, and how to get it back or delete it.`}
    >
      <P>
        ChefCode is invoice software for food service teams. You upload a supplier invoice, our
        system reads it, assigns GL codes, and gives you back structured data you can review and
        export. This page describes what happens to information along the way. It is written to be
        read, not to be survived — if something here is unclear, ask us and we will fix the wording.
      </P>

      <H2 id="what-we-collect">1. What we collect</H2>

      <H3>Account information</H3>
      <P>
        When you create an account we store your email address and password (the password is hashed
        by our authentication provider — we never see or store the plain text). When you or your
        administrator completes your profile we also store your full name, your role (Owner,
        Manager, Chef or Viewer), which organization you belong to, and which location you are
        assigned to.
      </P>

      <H3>Organization information</H3>
      <P>
        The name and type of your organization (hotel, restaurant, university, hospital or other),
        your plan, and your configured limits for locations and team members.
      </P>

      <H3>Business data you put into the product</H3>
      <P>
        This is the bulk of what we hold, and it is business data rather than personal data:
      </P>
      <UL>
        <LI>Invoice records — vendor name, invoice number, invoice date, total amount, delivery address, and status</LI>
        <LI>Invoice line items — product description, product number, quantity, unit price, line total, and the assigned GL code</LI>
        <LI>Your chart of accounts (GL codes), your product list, your vendor list, and your locations</LI>
        <LI>Which user processed a given invoice, and when records were created and last changed</LI>
      </UL>

      <H2 id="what-we-dont">2. What we do not collect</H2>
      <Callout>
        <strong>We do not store your invoice images.</strong> The photo or PDF you upload is sent
        for text extraction, the structured result is saved to your account, and the image itself is
        never written to our database or file storage. There is no archive of invoice scans to
        breach, subpoena or leak.
      </Callout>
      <UL>
        <LI><strong>No student data.</strong> ChefCode processes supplier invoices. It has no access to student records, enrollment, meal-plan accounts or any other education record.</LI>
        <LI><strong>No payment card data.</strong> We do not collect or process card numbers. Billing is arranged directly with us.</LI>
        <LI><strong>No tracking or advertising cookies.</strong> We do not run analytics tags, advertising pixels or third-party trackers on the product. Your browser stores a session token so you stay signed in, and a few small preferences.</LI>
        <LI><strong>No selling of data, ever.</strong> We do not sell, rent or share your data with third parties for their own purposes.</LI>
      </UL>

      <H2 id="ai-processing">3. How invoice reading works, and what that means for your data</H2>
      <P>
        This section matters more than the rest, so it is deliberately specific.
      </P>
      <P>
        To read an invoice, ChefCode sends the image or PDF you uploaded to Google's Gemini API,
        which performs the text extraction and returns structured line items. The request goes
        directly from your browser to Google. The extracted data then comes back to your browser,
        you review it, and only what you save is written to our database.
      </P>
      <P>
        This means the contents of an invoice you upload are processed by Google as part of
        delivering the feature. Google's handling of that data is governed by the terms of the
        Gemini API. We do not send Google your name, your email, your organization or any other
        account information — only the document itself and the instructions needed to read it.
      </P>
      <Callout>
        If your organization cannot send supplier documents to a third-party AI provider, tell us
        before you start. That constraint is workable, but it changes how we would deploy for you,
        and it is far cheaper to discuss up front than to discover later.
      </Callout>

      <H2 id="subprocessors">4. Who else touches your data</H2>
      <P>
        We keep this list short on purpose. These are every third party involved in running
        ChefCode:
      </P>
      <Table
        head={['Provider', 'What it does', 'What it sees']}
        rows={[
          ['Supabase (hosted on AWS)', 'Database and authentication', 'All stored account and business data'],
          ['Google (Gemini API)', 'Reads the uploaded invoice', 'The invoice image or PDF, at the moment of upload'],
          ['Vercel', 'Serves the website and application', 'Standard web request data, including IP address'],
          ['Google Fonts', 'Serves the typeface used by the site', 'Your IP address when the page loads'],
          ['Unsplash', 'Serves the photograph on the sign-in screen', 'Your IP address when the sign-in screen loads'],
        ]}
      />

      <H2 id="security">5. How your data is protected</H2>
      <UL>
        <LI><strong>In transit:</strong> every connection uses TLS. Data is never sent over an unencrypted channel.</LI>
        <LI><strong>At rest:</strong> our database provider encrypts stored data at rest and is SOC 2 Type II certified. That certification covers their infrastructure; ChefCode itself is not separately SOC 2 certified, and we will not imply otherwise.</LI>
        <LI><strong>Tenant isolation:</strong> every table enforces row-level security in the database, scoped to your organization. One customer cannot read another customer's rows even if the application layer had a bug, because the restriction is enforced by the database rather than by application code.</LI>
        <LI><strong>Access control:</strong> four roles — Owner, Manager, Chef and Viewer — determine what each team member can see and do, and users can be restricted to a single location.</LI>
      </UL>
      <P>
        Our full technical write-up is on the <a className="text-brand-600 font-medium underline hover:text-brand-700" href="/security">Security Overview</a> page.
      </P>

      <H2 id="retention">6. How long we keep things</H2>
      <P>
        We keep your data for as long as your account is active, because the product's accuracy
        depends on the history you have built: your product list is what teaches the system your GL
        codes. Uploaded invoice images are never retained at all, as described above.
      </P>
      <P>
        If you close your account, tell us and we will delete your organization's data within 30
        days. Deleting your organization removes its locations, GL codes, vendors, products,
        invoices and line items by cascade. Backups taken before deletion age out on our provider's
        normal backup cycle.
      </P>

      <H2 id="your-rights">7. Your rights</H2>
      <P>
        Wherever you are, we will honour these. If you are in California, the EEA or the UK, some of
        them are also legal entitlements under the CCPA/CPRA, the GDPR or the UK GDPR.
      </P>
      <UL>
        <LI><strong>Access</strong> — ask what we hold about you and get a copy.</LI>
        <LI><strong>Export</strong> — you can export your invoice data to CSV or PDF from inside the product at any time, without asking us.</LI>
        <LI><strong>Correction</strong> — fix anything inaccurate, in the product or by asking us.</LI>
        <LI><strong>Deletion</strong> — ask us to delete your account and your organization's data.</LI>
        <LI><strong>Complaint</strong> — raise a concern with your local data protection authority. We would rather you came to us first so we can actually fix it.</LI>
      </UL>
      <P>
        We do not sell personal information, so there is nothing for you to opt out of under the
        CCPA's "do not sell" right.
      </P>

      <H2 id="roles">8. Who is responsible for what</H2>
      <P>
        For the business data you put into ChefCode — invoices, vendors, products, GL codes — your
        organization is the controller and we are the processor. We act on your instructions and do
        not use your business data for our own purposes. For your account information (your email,
        your name, your role) we are the controller.
      </P>
      <P>
        Details are on the <a className="text-brand-600 font-medium underline hover:text-brand-700" href="/dpa">Data Processing</a> page.
      </P>

      <H2 id="transfers">9. Where your data lives</H2>
      <P>
        ChefCode's database and hosting are in the United States. If you access the product from
        outside the US, your data will be transferred to and processed in the US.
      </P>

      <H2 id="children">10. Children</H2>
      <P>
        ChefCode is a business tool and is not directed at children. We do not knowingly collect
        personal information from anyone under 16.
      </P>

      <H2 id="changes">11. Changes to this policy</H2>
      <P>
        If we change this policy we will update the date at the top of this page. For a change that
        materially affects how we handle your data, we will tell account owners directly rather than
        relying on you to notice.
      </P>

      <H2 id="contact">12. Contact</H2>
      <P>
        For any privacy question, data request, or to report a concern, get in touch and a human
        will respond — there is no ticket queue, the company is small enough that you reach us
        directly.
      </P>
      <ContactBlock email={PRIVACY_CONTACT_EMAIL} subject="Privacy request" />
    </LegalLayout>
  );
}

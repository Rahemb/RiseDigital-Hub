// Applies only to system-generated messages, never notes or saved drafts.
const messages: Record<string, string> = {
  Totalt: "Total leads",
  Nye: "New leads",
  Kvalifiserte: "Qualified leads",
  Ny: "New",
  Kvalifisert: "Qualified",
  Avvist: "Not a fit",
  Kontaktet: "Contacted",
  Interessert: "Interested",
  Konvertert: "Converted",
  "Må vurderes": "Reviewing",
  Alle: "All",
  Velg: "Select",
  Bedrift: "Company",
  Bedriftsnavn: "Company name",
  Bedriftsinformasjon: "Company information",
  Bransje: "Industry",
  Kommune: "Municipality",
  Kommunenummer: "Municipality code",
  Nettside: "Website",
  Tagger: "Tags",
  Kvalifisering: "Qualification",
  Kontaktstatus: "Contact status",
  Poeng: "Score",
  Status: "Status",
  Navn: "Name",
  Mal: "Template",
  Emne: "Subject",
  Melding: "Message",
  Notater: "Notes",
  "Kilde:": "Source:",
  "Org.nr.": "Org. no.",
  Registrert: "Added",
  Lagre: "Save",
  Lagret: "Saved",
  "Lagrer …": "Saving …",
  Filtrer: "Filter",
  Nullstill: "Reset",
  Sortering: "Sort",
  Side: "Page",
  Sist: "Last",
  Kontrollert: "Checked",
  Ukjent: "Unknown",
  ukjent: "unknown",
  gjeldende: "current",
  Ferdig: "Completed",
  Fortsett: "Resume",
  Pause: "Pause",
  Mislyktes: "Failed",
  Innstillinger: "Settings",
  Forhåndsvisning: "Preview",
  Importer: "Import",
  importert: "imported",
  valgte: "selected",
  av: "of",
  Fant: "Found",
  Hei: "Hello",
  Besvart: "Replied",
  Renhold: "Cleaning companies",
  Butikker: "Retail shops",
  Kontaktperson: "Contact person",
  Mottakertype: "Recipient type",
  "E-poststatus": "Email status",
  "Aktivitet vises når du registrerer din første bedrift.":
    "Activity appears when you add your first lead.",
  "Aktivitetsnotat / vurderingsgrunnlag": "Activity note / review evidence",
  "Alle bedrifter": "All leads",
  "Alle bransjer": "All industries",
  "Andre bransjer": "Other industries",
  "Arbeider …": "Working …",
  "Automatisk analyse er ikke tillatt eller robots.txt kunne ikke avklares":
    "Automated analysis is not allowed or robots.txt could not be verified",
  "Automatisk nettsidesøk ·": "Automatic website discovery ·",
  "Avslutt kø": "Stop Queue",
  "Avslutte gjenstående søk? Gjeldende kontroll får fullføre.":
    "Stop remaining searches? The current check will finish.",
  "Avsluttet av bruker": "Stopped by user",
  "Bare gyldige, nye og ikke reserverte bedrifter importeres. Kontrollen gjentas ved lagring.":
    "Only valid, new, non-suppressed companies are imported. Checks run again when saving.",
  "Bedriften analyseres allerede": "This company is already being analyzed",
  "Bedriften er konvertert. Fortsett kundearbeidet i kundeprofilen.":
    "This lead has been converted. Continue in the client profile.",
  "Bedriften finnes ikke": "Lead not found",
  "Bedriften har registrert sletting eller avvikling; automatisk tilknytning er stoppet.":
    "The company is marked as deleted or closing; automatic verification has stopped.",
  "Bedriftsinformasjon bekreftet av Enhetsregisteret.":
    "Company information verified by Enhetsregisteret.",
  "Bedriftsinformasjon gjennomgått og lagret": "Company review saved",
  "Bedriftsnavn eller organisasjonsnummer":
    "Company name or organization number",
  "Bedriftstilknytning bekreftet manuelt:":
    "Company association manually confirmed:",
  "Bedriftstilknytning bekreftet. Kjør nettsideanalysen for tekniske funn og oppdaterte poeng.":
    "Company association confirmed. Run an audit for technical findings and an updated score.",
  "Bedriftstilknytning vurderes separat fra teknisk nettsidekontroll. En side som svarer HTTP 200 er ikke automatisk riktig bedrift.":
    "Company identity is checked separately from technical availability. An HTTP 200 response does not establish ownership.",
  "Bekreft kandidat manuelt": "Confirm candidate manually",
  "Bekreft nettside og kjør analyse": "Verify website and run audit",
  "Bekrefte at denne nettsiden tilhører bedriften? En eksisterende nettadresse vil bli erstattet.":
    "Confirm this website belongs to the company? Any existing website URL will be replaced.",
  "Bilverksted og bilpleie": "Car repair and detailing",
  "Bransjen finnes i de valgte tjenestekategoriene.":
    "Industry matches the selected service categories.",
  "Bruk en offentlig HTTP(S)-adresse uten innlogging eller spesialport":
    "Use a public HTTP(S) URL without credentials or a custom port",
  "Bruk konvertering til kunde": "Use Convert to client",
  "Brønnøysund svarte med HTTP": "Brønnøysund returned HTTP",
  "Bygg og håndverk": "Construction and trades",
  "CSV har et uavsluttet tekstfelt": "CSV contains an unclosed quoted field",
  "CSV-filen kan være maksimalt 500 KB": "CSV files must not exceed 500 KB",
  "DNS peker til en privat eller reservert adresse":
    "DNS resolves to a private or reserved address",
  "DNS-oppslag tok for lang tid": "DNS lookup timed out",
  "Den hentede siden ble levert over HTTP, ikke HTTPS.":
    "The fetched page was served over HTTP, not HTTPS.",
  "Det registrerte bedriftsnavnet finnes i synlig HTML-tekst.":
    "The registered company name appears in visible HTML text.",
  "Dette er tekniske observasjoner, ikke en full vurdering av nettsiden.":
    "These are technical observations, not a complete website assessment.",
  "Digitale verktøy": "Digital tools",
  "Dokumenter samtykke eller et konkret relevant unntak for personlig mottaker":
    "Document consent or a specific relevant exception for a personal recipient",
  "Dokumenter svar, kontakt, reservasjon eller grunnlaget for godkjenning":
    "Record a reply, contact, opt-out, or the basis for approval",
  "Dupliserte kolonneoverskrifter": "Duplicate column headers",
  "E-postutkast lagret. Ingen e-post er sendt.":
    "Email draft saved. No email was sent.",
  "E-postutkast og manuell oppfølging": "Prepare outreach and track progress",
  "Eksakt organisasjonsnummer finnes i synlig HTML-tekst.":
    "The exact organization number appears in visible HTML text.",
  "Eksisterende eller nylig endrede nettsideopplysninger er bevart. Bekreft kandidaten manuelt.":
    "Existing or recently edited website information was preserved. Confirm the candidate manually.",
  "Eksisterende nettadresse": "Existing website URL",
  "Eksisterende nettadresse; bedriftstilknytning må kontrolleres.":
    "Existing website URL; company association needs verification.",
  "Eksporter CSV": "Export CSV",
  "Eksportgrensen er 10 000 rader.": "The export limit is 10,000 rows.",
  "Eller lim inn CSV": "Or paste CSV",
  "Emnet kan ikke ha linjeskift": "Subject must not contain line breaks",
  "En annen nettsidekontroll kjører for bedriften. Prøv igjen senere.":
    "Another website check is running for this company. Try again later.",
  "En kandidat finnes, men bedriftstilknytningen må bekreftes manuelt.":
    "A candidate was found, but company association needs manual confirmation.",
  "En kø finnes allerede. Fortsett eller avslutt den før et nytt søk.":
    "A queue already exists. Resume or stop it before starting a new search.",
  "En lett kontroll av offentlig HTML, ikke full mobil-, SEO- eller tilgjengelighetstesting. Nettsteder kan avvise automatiske besøk. Vent minst ett minutt mellom kontroller.":
    "A basic check of public HTML, not a full mobile, SEO or accessibility audit. Sites may block automated visits. Wait at least one minute between checks.",
  "En nettside analyseres allerede. Prøv igjen etterpå.":
    "A website is already being analyzed. Try again afterwards.",
  "En tom nettadresse betyr «ukjent», ikke «ingen nettside». Organisasjonsnummeret kan ikke endres etter import.":
    "An empty URL means unknown, not no website. Organization numbers cannot be changed after import.",
  "En valgt bedrift tilhører ikke dette arbeidsområdet":
    "A selected lead does not belong to this workspace",
  "Enhetsregisteret – underenhet": "Enhetsregisteret – subunit",
  "Enhetsregisteret, underenheter og Wikidata kontrolleres med eksakt organisasjonsnummer. Ingen domener gjettes. Nettsiden må ha dokumentert bedriftstilknytning før automatisk analyse. Treff er ikke garantert.":
    "Checks Enhetsregisteret, subunits and Wikidata using the exact organization number. Domains are never guessed. Website association must be verified before automatic auditing. Coverage is limited.",
  "Et forslag til": "An idea for",
  "Fant ingen metabeskrivelse i den hentede HTML-koden.":
    "No meta description was found in the fetched HTML.",
  "Fant ingen sidetittel i den hentede HTML-koden.":
    "No page title was found in the fetched HTML.",
  "Fant ingen språkangivelse på html-elementet.":
    "No language attribute was found on the HTML element.",
  "Fant ingen viewport-metatag i den hentede HTML-koden.":
    "No viewport meta tag was found in the fetched HTML.",
  "Feil antall kolonner": "Incorrect number of columns",
  "Filen er større enn 500 KB": "The file exceeds 500 KB",
  "Finn bedrifter": "Discover",
  "Finn bedrifter i Enhetsregisteret": "Discover companies",
  "Finn bedrifter, vurder muligheter og følg opp med omtanke.":
    "Discover → Review on Google → Qualify → Prepare outreach → Track progress",
  "Finn nettsider automatisk": "Find Websites Automatically",
  "Finn nettsider for alle uten nettside":
    "Find websites for leads without a URL",
  "Finn nettsider for de": "Review the",
  "Finn nettsider for valgte bedrifter":
    "Advanced: find websites for selected leads",
  "Finn nettsider for valgte bedrifter (": "Find websites for selected leads (",
  "Finn nettsider og analyser (kun bekreftede treff)":
    "Find websites and audit verified matches",
  "Finn nettsider og analyser – oppdater poeng kun for bekreftede nettsider":
    "Find websites and audit — update scores for verified websites only",
  "Finnes allerede / duplikat": "Already exists / duplicate",
  "Fjern nettadressen før «ingen nettside» bekreftes":
    "Remove the URL before confirming no website",
  "Flere eksisterende kunder har dette organisasjonsnummeret. Avklar duplikatene manuelt.":
    "Multiple existing clients have this organization number. Resolve duplicates manually.",
  "Flere sider finnes; søket er bevisst begrenset.":
    "More pages exist; this search is intentionally bounded.",
  "For lang nettadresse": "URL is too long",
  "For mange omdirigeringer": "Too many redirects",
  "Forbindelsen ble brutt. Fremdriften er lagret. Hent status og fortsett etter at gjeldende kontroll er ferdig.":
    "Connection lost. Progress was saved. Refresh status and resume after the current check finishes.",
  "Forfalt oppfølging": "Overdue follow-up",
  "Forhåndsvisning av lagret utkast": "Saved draft preview",
  "Forhåndsvisningen er ugyldig. Søk på nytt.":
    "Invalid preview. Search again.",
  "Forhåndsvisningen er utløpt. Søk på nytt.": "Preview expired. Search again.",
  "Forhåndsvisningen utløper etter 15 minutter. Innstillingen for forespørselsgrense kan redusere antallet per side.":
    "Preview expires after 15 minutes. Request limits may reduce results per page.",
  "Forrige side": "Previous page",
  "Fremdrift for nettsidesøk": "Website discovery progress",
  "Fremdrift ·": "Progress ·",
  "Frisører og skjønnhet": "Hairdressers and beauty salons",
  "Fullfør og dokumenter kontaktvurderingen":
    "Complete and document the compliance review",
  "Generell bedriftsadresse": "General business address",
  "Godkjenn kontaktvurderingen først": "Approve the compliance review first",
  "Godkjent for kontakt": "Approved for contact",
  "H1-elementer i den hentede HTML-koden.": "H1 elements in the fetched HTML.",
  "HTTPS kunne ikke bekreftes med denne kontrollen.":
    "HTTPS could not be verified in this check.",
  "HTTPS kunne ikke bekreftes. Dette beviser ikke at HTTPS er utilgjengelig.":
    "HTTPS could not be verified. This does not prove HTTPS is unavailable.",
  "HTTPS var tilgjengelig med godkjent TLS-sertifikat under kontrollen.":
    "HTTPS was available with a valid TLS certificate during the check.",
  "HTTPS-versjonen svarte også. Vurder å bruke HTTPS-adressen.":
    "The HTTPS version also responded. Consider using the HTTPS URL.",
  "Hele Norge": "All of Norway",
  "Hent status": "Refresh Status",
  "Henter bedrifter …": "Loading companies …",
  "Historikk · siste 50 hendelser": "History · latest 50 events",
  "Hoppet over": "Skipped",
  "Hvordan kontrollerte du tilknytningen?":
    "How did you verify the company association?",
  "Høyeste poeng": "Highest score",
  "I kø": "Queued",
  "IKKE MÅLT": "NOT MEASURED",
  "Identifiserbar person": "Identifiable individual",
  "Ikke funnet": "Not found",
  "Ikke interessert": "Not interested",
  "Ikke kontakt": "Do not contact",
  "Ikke kontaktet": "Not contacted",
  "Ikke kontrollert": "Not verified",
  "Ikke oppgitt": "Not provided",
  "Importen mislyktes. Prøv igjen.": "Import failed. Try again.",
  "Importer bedrifter fra CSV": "Import leads from CSV",
  "Importer gyldige rader": "Import valid rows",
  "Importer maksimalt 200 rader om gangen":
    "Import no more than 200 rows at a time",
  "Ingen aktiv kø": "No active queue",
  "Ingen bedrifter i utvalget.": "No companies in this selection.",
  "Ingen bedrifter passer søket. Finn bedrifter i registeret eller registrer en manuelt.":
    "No matching leads. Discover companies or add a lead manually.",
  "Ingen bedrifter valgt eller uten nettadresse":
    "No selected companies or companies without a website URL",
  "Ingen e-post sendes av Hub. Roundcube brukes fortsatt til sending og svar. Loggfør kontakt manuelt etter sending.":
    "Hub does not send email. Use Roundcube to send and receive messages, then log contact here.",
  "Ingen kandidater er lagret": "No saved candidates",
  "Ingen kontaktopplysninger antas bekreftet. Kontroller kilde og mottaker i bedriftsprofilen før kontakt.":
    "Contact details are unverified. Check the source and recipient in the lead profile before contact.",
  "Ingen nettadresse funnet": "No website URL found",
  "Ingen nettside (manuelt bekreftet)": "No website (manually confirmed)",
  "Ingen nye bedrifter på denne siden. Prøv neste side eller andre filtre.":
    "No new companies on this page. Try the next page or change your filters.",
  "Ingen pålitelig nettside funnet": "No verified website found",
  "Ingen pålitelig nettside funnet i de kontrollerte kildene. Dette beviser ikke at bedriften mangler nettside.":
    "No reliable website found in the checked sources. This does not mean the company has no website.",
  "Ingen tilgjengelig HTML-side (HTTP": "No available HTML page (HTTP",
  "Ingen treff": "No Match Found",
  "Ingen tydelig strukturert data funnet i responsen; vurder behovet manuelt.":
    "No clear structured data found in the response; review requirements manually.",
  "Innstillingene gjelder dette arbeidsområdet. Endring nullstiller gjeldende poeng; historiske vurderinger bevares. Kjør ny analyse for å bruke de nye reglene.":
    "Settings apply to this workspace. Changes reset current scores, preserving historical assessments. Run a new audit to apply updated rules.",
  "Innstillinger lagret. Kjør ny analyse for oppdaterte poeng.":
    "Settings saved. Run a new audit to update scores.",
  "Interne notater": "Other notes",
  "Interne, private og reserverte nettadresser er blokkert":
    "Internal, private and reserved addresses are blocked",
  "Jeg har kontrollert e-postleverandørens vilkår og mulighet for reservasjon.":
    "I checked the email provider terms and opt-out process.",
  "Jeg har kontrollert mottaker, adressekilde og det ferdige utkastet.":
    "I checked the recipient, address source and final draft.",
  "Jeg har manuelt bekreftet at bedriften ikke har nettside":
    "I manually confirmed this company has no website",
  "Jeg har vurdert og dokumentert relevant samtykke eller annet konkret lovlig grunnlag.":
    "I reviewed and documented relevant consent or another specific lawful basis.",
  "Jeg kom over": "I came across",
  "Kandidaten finnes ikke": "Candidate not found",
  "Katalog- eller sosialprofil er ikke en verifisert egen bedriftsnettside.":
    "A directory or social profile is not a verified company-owned website.",
  "Kilde (URL eller dokumentert manuell kontroll)":
    "Source (URL or documented manual verification)",
  "Kilden er utilgjengelig": "Source unavailable",
  "Kilden har bedt om en pause. Prøv igjen senere.":
    "The source requested a pause. Try again later.",
  "Kilden har begrenset forespørsler. Nytt forsøk må vente.":
    "The source has limited requests. Wait before retrying.",
  "Kilden knytter nettadressen til dette organisasjonsnummeret.":
    "The source associates this URL with the organization number.",
  "Kilden svarte med HTTP": "The source returned HTTP",
  "Kildesvaret overskrider størrelsesgrensen":
    "The source response exceeds the size limit",
  "Klar for import": "Ready to import",
  "Klar for neste bedrift": "Ready for next company",
  "Klargjør for e-postprogram": "Prepare for email client",
  "Koblet til eksisterende": "Linked to existing",
  "Koblet til kunderegisteret": "Linked to client records",
  "Koblet til kunderegisteret uten å endre eksisterende kundedata":
    "Linked to client records without changing existing client data",
  "Kommune / bransje": "Location / industry",
  "Kommunenummer (overstyrer område)": "Municipality code (overrides region)",
  "Komprimert svar er ikke støttet av den begrensede analysen":
    "Compressed responses are not supported by this basic audit",
  "Konfigurasjon (JSON)": "Configuration (JSON)",
  "Kontakt må vurderes og godkjennes først":
    "Contact must be reviewed and approved first",
  "Kontakt og oppfølging": "Outreach and follow-ups",
  "Kontaktopplysninger og kilde": "Contact details and verification",
  "Kontaktreservasjon registrert. Utkast, godkjenning, kopiering og konvertering er blokkert.":
    "Do-not-contact restriction recorded. Drafts, approval, copying and conversion are blocked.",
  "Kontaktreservasjon: import blokkert":
    "Do-not-contact restriction: import blocked",
  "Kontaktside kunne ikke kontrolleres:": "Contact page could not be checked:",
  "Kontroll mislyktes": "Check failed",
  "Kontroll mislyktes:": "Check failed:",
  "Kontroller alle påstander før bruk. Endringer opphever tidligere godkjenning.":
    "Check every claim before use. Editing revokes previous approval.",
  "Kontroller at den lokale databasen er tilgjengelig.":
    "Check that the local database is available.",
  "Kontroller e-post, kilde og mottakertype først":
    "Check the email, source and recipient type first",
  "Kontroller gyldig verdi og tillatt lengde for:":
    "Check the value and allowed length for:",
  "Kontrollerer nettsiden …": "Checking website …",
  "Kontrollerer én bedrift …": "Checking one company …",
  "Kontrollerer …": "Checking …",
  "Kontrollert første side med inntil 20 underenheter.":
    "Checked the first page of up to 20 subunits.",
  "Konverter / koble til kunde": "Convert / link to client",
  "Konverter til kunde": "Convert to client",
  "Kopier e-post til Roundcube": "Copy email for Roundcube",
  "Kopiert. Lim inn i Roundcube og kontroller mottakeren før du sender.":
    "Copied. Paste into Roundcube and check the recipient before sending.",
  "Krever kvalifisert bedrift. Eksisterende kunde med samme organisasjonsnummer kobles til uten endringer. Fyll inn bekreftet kontaktinformasjon som i kunderegisteret; ingenting genereres.":
    "Qualification is required. Existing clients with the same organization number are linked without changes. Enter verified contact details; nothing is generated.",
  "Kun aktive (ingen registrerte avviklings-/konkursmarkører)":
    "Active companies only (no closure or bankruptcy markers)",
  "Kundens e-post": "Client email",
  "Kunne ikke behandle filen. Kontroller innholdet og prøv igjen.":
    "Could not process the file. Check its contents and try again.",
  "Kunne ikke behandle nettsidesøket. Prøv igjen.":
    "Could not process website discovery. Try again.",
  "Kunne ikke bekreftes": "Could not verify",
  "Kunne ikke hente fremdrift": "Could not load progress",
  "Kunne ikke hente registerdata. Kontroller internett og prøv igjen.":
    "Could not fetch registry data. Check your connection and try again.",
  "Kunne ikke klargjøre meldingen. Kontroller nettlesertillatelsene og prøv igjen.":
    "Could not prepare the message. Check browser permissions and try again.",
  "Kunne ikke kontrolleres": "Could not check",
  "Kunne ikke lagre. Prøv igjen, eller kontroller feltene.":
    "Could not save. Check the fields and try again.",
  "Kunne ikke laste Lead Finder": "Could not load Lead Finder",
  "Kunne ikke oppdatere køen": "Could not update the queue",
  "Kunne ikke starte køen": "Could not start the queue",
  "Kunne ikke starte nettsidesøket": "Could not start website discovery",
  "Kvalifiser bedriften før konvertering": "Qualify the lead before conversion",
  "Lag nytt utkast": "Create new draft",
  "Lagre innstillinger": "Save settings",
  "Lagre kontaktstatus og logg": "Save contact status and activity",
  "Lagre kontaktstatus og vurdering? Reservasjon blokkerer videre kontakt.":
    "Save contact status and review? Opt-out blocks further contact.",
  "Lagre og gjennomgå et utkast først": "Save and review a draft first",
  "Lagre redigert utkast": "Save edited draft",
  "Legg til en nettadresse først": "Add a website URL first",
  "Les markedsføringsloven § 15 ↗": "Read the Marketing Control Act § 15 ↗",
  "Maksimalt 500 bedrifter per kø. Velg en mindre gruppe.":
    "Maximum 500 companies per queue. Select a smaller group.",
  "Maksimalt antall per søkeside": "Maximum results per page",
  "Manuell bekreftelse:": "Manual confirmation:",
  "Manuell registrering": "Add lead manually",
  "Manuelt bekreftet": "Manually confirmed",
  "Manuelt bekreftet kandidat fra": "Manually confirmed candidate from",
  "Manuelt registrert": "Manually entered",
  "Manuelt registrert eller tidligere import":
    "Manually entered or previously imported",
  "Minst én kilde eller nettside kunne ikke kontrolleres. Ukjent er ikke det samme som ingen nettside.":
    "At least one source or website could not be checked. Unknown does not mean no website.",
  "Mulig nettside – må bekreftes": "Possible website — needs confirmation",
  "Mulig strukturert data funnet; gyldighet er ikke kontrollert.":
    "Possible structured data found; validity was not checked.",
  "Mulige nettsideforbedringer": "Potential website improvements",
  "Mulige nettsidetreff": "Possible website matches",
  "Mulige treff": "Possible matches",
  "Navn A–Å": "Name A–Z",
  "Navn, org.nr. eller tagg": "Name, organization number or tag",
  "Neste oppfølging": "Next follow-up",
  "Neste side": "Next page",
  "Neste →": "Next →",
  "Nettside (valgfritt)": "Website (optional)",
  "Nettside i registeret": "Registry website",
  "Nettside kontrollert og poeng beregnet":
    "Website checked and score calculated",
  "Nettside kontrollert og vurdering lagret":
    "Website checked and assessment saved",
  "Nettside og forbedringer": "Website improvements",
  "Nettsidefelt funnet.": "Website field found.",
  "Nettsidefelt ikke oppgitt.": "Website field not provided.",
  "Nettsidekontroll og kvalifisering": "Website audit and scoring",
  "Nettsidekontrollen nådde tidsgrensen": "Website check timed out",
  "Nettsiden ble endret før analyse": "Website URL changed before the audit",
  "Nettsiden er knyttet til bedriften med dokumenterte identifikatorer.":
    "The website is associated with the company through documented identifiers.",
  "Nettsiden kunne ikke kontrolleres": "Website could not be checked",
  "Nettsiden overskrider størrelsesgrensen": "Website exceeds the size limit",
  "Nettsiden svarte ikke innen 10 sekunder":
    "Website did not respond within 10 seconds",
  "Nettsiden svarte med HTTP": "Website returned HTTP",
  Nettsidesøk: "Website discovery",
  "Nettsidetilknytning bekreftet, men analyse mislyktes:":
    "Website association confirmed, but audit failed:",
  "Nyeste først": "Newest first",
  Næringskode: "Industry code",
  "OBSERVERT I HTML": "OBSERVED IN HTML",
  "Offentlig HTML svarte med HTTP": "Public HTML returned HTTP",
  "Offentlig e-post er ikke automatisk tillatelse til markedsføring. Vurder markedsføringsloven § 15, mottakeren og leverandørens vilkår. Hub foretar ingen juridisk avgjørelse.":
    "A public email address does not automatically permit marketing. Review the Norwegian Marketing Control Act § 15, the recipient and provider terms. Hub does not make legal determinations.",
  "Offentlig e-postadresse": "General business email",
  "Offentlig kontaktadresse (valgfritt)": "Public contact email (optional)",
  "Offentlige registerdata fra Brønnøysundregistrene (NLOD). Nettside og e-post er ikke alltid oppgitt. Søket importerer ingenting før du velger bedrifter.":
    "Public company information from Brønnøysundregistrene (NLOD). Select companies to import, then review them on Google. Website and email information may be missing.",
  "Offisiell dokumentasjon fra Brønnøysundregistrene":
    "Official Brønnøysundregistrene documentation",
  "Offisielle bedriftsopplysninger kunne ikke oppdateres.":
    "Official company information could not be refreshed.",
  "Også oppgitt i": "Also listed in",
  "Omdirigering til annet vertsnavn krever manuell bekreftelse.":
    "A redirect to another hostname requires manual confirmation.",
  "Omdirigering til katalog eller sosialprofil må vurderes manuelt.":
    "A redirect to a directory or social profile needs manual review.",
  Omdirigeringssløyfe: "Redirect loop",
  Område: "Region",
  Oppfølging: "Follow-up",
  "Oppgi e-post og kilde før bekreftelse":
    "Enter email and source before verification",
  "Opplysninger ble endret manuelt. Kjør et nytt nettsidesøk eller bekreft kandidaten på nytt.":
    "Details were manually edited. Run discovery again or reconfirm the candidate.",
  "Opprette kundekobling? Eksisterende kundedata endres ikke.":
    "Create client link? Existing client data will not change.",
  "Organisasjonsnummeret i svaret stemmer ikke":
    "The organization number in the response does not match",
  "Oslo, Lillestrøm og Lørenskog": "Oslo, Lillestrøm and Lørenskog",
  "Oversikt og bedrifter": "Overview",
  "Overskriftene companyName og orgNumber er påkrevd":
    "Headers companyName and orgNumber are required",
  "Prioriter bekreftede nettsider etter aktuelle forbedringspoeng →":
    "Prioritize verified websites by current opportunity score →",
  "Prioritering av mulige tjenester, ikke en kvalitetsrangering av bedriften. Ingen poeng gis for ukjente opplysninger.":
    "Service opportunity score, not a company quality rating. Unknown information earns no points.",
  "Profesjonelle tjenester": "Professional services",
  "Prøv igjen": "Try again",
  "Prøv mislykkede på nytt": "Retry Failed",
  "Publisert adresse bekrefter ikke leverbarhet eller tillatelse til markedsføring. Ikke registrer private personadresser fra uvedkommende kilder.":
    "A published address does not verify deliverability or permission to market. Do not collect private personal addresses from unrelated sources.",
  "Publisert av oppgitt kilde": "Published by the stated source",
  "Påkrevd før «Godkjent for kontakt»": "Required before approval for contact",
  "Rangering, konvertering, ytelse, kontrast, tastaturbruk og JavaScript-renderet innhold er ikke målt.":
    "Rankings, conversions, performance, contrast, keyboard access and JavaScript-rendered content were not measured.",
  "Registeret er utilgjengelig": "Registry unavailable",
  "Registrer bedrift": "Add lead",
  "Registrer bedrift manuelt": "Add lead manually",
  "Registrert fra": "Imported from",
  "Regler og forespørselsgrenser": "Rules and request limits",
  "Responsen er ikke en HTML-side": "Response is not an HTML page",
  "Restauranter og kafeer": "Restaurants and cafés",
  "Samtykke eller konkret unntak (påkrevd ved personlig mottaker)":
    "Consent or specific exception (required for personal recipients)",
  "Satt på pause": "Paused",
  "Serveren svarte med HTTP": "Server returned HTTP",
  "Sist søkt:": "Last searched:",
  "Siste aktivitet": "Recent activity",
  "Siste forsøk:": "Last attempt:",
  "Sletting eller avvikling registrert. Automatisk tilknytning stoppet.":
    "Deletion or closure registered. Automatic association stopped.",
  "Sterk tilknytning: eksakt organisasjonsnummer på nettstedet, støttet av registerkilde eller registrert navn.":
    "Strong association: exact organization number on the website, supported by the registry source or registered name.",
  "Sterkt treff": "Strong match",
  "Svaret fra registeret var for stort": "Registry response was too large",
  "Synlighet og innhold": "Visibility and content",
  Søk: "Search",
  "Søk i registeret": "Search Companies",
  "Søk i utvalget": "Search Companies",
  "Søk manuelt etter nettside ↗": "Search on Google",
  "Søket mislyktes. Prøv igjen.": "Search failed. Try again.",
  "Teknisk bekreftet": "Technically verified",
  "Til vurdering": "Awaiting review",
  "Tilgang begrenset (HTTP": "Access restricted (HTTP",
  "Tilknytningen er ikke sikker nok. HTTP-svar, navnelikhet og domenelikhet alene gir aldri automatisk bekreftelse.":
    "Association is not sufficiently certain. HTTP responses, name similarity and domain similarity alone never trigger automatic verification.",
  "Tomt svar": "Empty response",
  "Tomt svar fra Brønnøysund": "Empty response from Brønnøysund",
  "Trening og velvære": "Fitness and wellness",
  "UTF-8, komma eller semikolon. Maksimalt 500 KB og 200 rader. companyName og orgNumber er påkrevd. Eksisterende bedrifter overskrives aldri. E-post og nettsider importeres som ubekreftet.":
    "UTF-8, comma or semicolon separated. Maximum 500 KB and 200 rows. companyName and orgNumber are required. Existing leads are never overwritten. Emails and websites are imported as unverified.",
  "Ugyldig CSV etter avsluttende anførselstegn":
    "Invalid CSV after closing quote",
  "Ugyldig JSON. Kontroller komma, anførselstegn og klammer.":
    "Invalid JSON. Check commas, quotes and brackets.",
  "Ugyldig eller intern nettadresse avvist før nettverkstilgang.":
    "Invalid or internal URL rejected before network access.",
  "Ugyldig forhåndsvisning. Søk på nytt.": "Invalid preview. Search again.",
  "Ugyldig nettsideadresse": "Invalid website URL",
  "Ugyldig norsk organisasjonsnummer": "Invalid Norwegian organization number",
  "Ugyldig omdirigering": "Invalid redirect",
  "Ugyldig oppfølgingsdato": "Invalid follow-up date",
  "Ugyldig valg av bedrifter eller innstillinger.":
    "Invalid company selection or settings.",
  "Ukjent / ikke funnet": "Unknown / not found",
  "Ukjent / ikke oppgitt": "Unknown / not provided",
  "Ukjent bransje": "Unknown industry",
  "Ukjent datakilde": "Unknown source",
  "Ukjent handling": "Unknown action",
  "Utelat allerede importerte": "Exclude previously imported companies",
  "Uten nettside · bekreftet": "No website · confirmed",
  "Utilstrekkelige / utdaterte data": "Insufficient / outdated data",
  "Utilstrekkelige data": "Insufficient data",
  "Utilstrekkelige data. Manglende nettside er ikke et kvalitetsproblem.":
    "Insufficient data. An unknown website is not evidence of poor quality.",
  "Utkast klart": "Draft ready",
  "Utkast mangler": "Draft missing",
  "Utkast opprettet. Gjennomgå innholdet før kontakt.":
    "Draft created. Review it before contact.",
  "Utvalget viser opptil 500 nyeste bedrifter. Velg enkeltbedrifter fra profilene ved behov. «Alle uten nettside» inkluderer ikke manuelt bekreftet fravær av nettside.":
    "Shows up to 500 recent leads. Individual leads can also be selected from their profiles. Leads manually confirmed to have no website are excluded from missing-URL searches.",
  "VEILEDENDE VURDERING": "HEURISTIC RECOMMENDATION",
  "Valgfritt, f.eks. 0301": "Optional, e.g. 0301",
  "Valider og forhåndsvis": "Validate and preview",
  "Ved en enkel kontroll av den offentlig tilgjengelige HTML-koden fant jeg følgende:":
    "A basic check of the publicly available HTML showed:",
  "Velg / fjern alle på siden": "Select / clear all on this page",
  "Velg CSV-fil": "Choose CSV file",
  "Velg alle på siden": "Select all on this page",
  "Velg alle synlige (": "Select All Visible (",
  "Velg kandidat og dokumenter hvordan bedriftstilknytningen ble kontrollert":
    "Select a candidate and document how company association was checked",
  "Velg mellom 1 og 200 bedrifter": "Select between 1 and 200 companies",
  "Velg minst én bedrift først.": "Select at least one company first.",
  "Vellykket aktuell analyse": "Successful current audit",
  "Vellykket, aktuell analyse": "Successful current audit",
  "Vent ett minutt før nytt nettsidesøk for samme bedrift.":
    "Wait one minute before repeating discovery for this company.",
  "Vent ett minutt før samme nettside kontrolleres på nytt":
    "Wait one minute before checking the same website again",
  "Vent litt før neste forespørsel": "Wait briefly before the next request",
  "Vent til gjeldende kontroll er ferdig":
    "Wait for the current check to finish",
  "Vent til nettsidekontrollen er ferdig":
    "Wait for the website check to finish",
  "Venter på nettsidesøk": "Awaiting website discovery",
  "Verifisert nettside": "Verified website",
  "Verifiserte nettsider": "Verified websites",
  "Vi kan hjelpe med digitale verktøy og praktisk automatisering av arbeidsoppgaver.":
    "We can help with digital tools and practical workflow automation.",
  "Vi kan hjelpe med innhold og teknisk søkemotoroptimalisering.":
    "We can help with content and technical search engine optimization.",
  "Vi kan hjelpe med nettsideutvikling og forbedringer av eksisterende nettsider.":
    "We can help with website development and improvements to existing websites.",
  "Videre kontakt er blokkert for denne bedriften eller mottakeren":
    "Further contact is blocked for this company or recipient",
  "Viewport er et positivt mobilsignal; faktisk mobilbruk er ikke testet.":
    "A viewport tag is a positive mobile signal; actual mobile usability was not tested.",
  "Vurder mobilvisning manuelt. Manglende viewport alene beviser ikke dårlig brukervennlighet.":
    "Review mobile layout manually. A missing viewport alone does not prove poor usability.",
  "antall treff": "result count",
  "auditDays: 1–90 dager før observasjoner regnes som utdaterte. Gamle funn brukes ikke i nye utkast.":
    "auditDays: 1–90 days before observations expire. Outdated findings are not used in new drafts.",
  "bilder mangler alt-attributt i HTML-koden.":
    "images lack an alt attribute in the HTML.",
  "ikke gjeldende / kunne ikke bekreftes": "outdated / could not verify",
  "importerte bedriftene →": "imported leads →",
  "mappings: vedlikeholdbare næringskodeprefikser (SN2025). OTHER er en redigerbar startgruppe, ikke alle øvrige næringer. «Alle bransjer» har ingen kodebegrensning.":
    "mappings: editable industry code prefixes (SN2025). OTHER is an editable starter group, not all remaining industries. All industries has no code restriction.",
  "maxResults: 1–100 treff per søkeside. requestDelayMs: minst 1000 ms mellom eksterne jobber.":
    "maxResults: 1–100 results per page. requestDelayMs: at least 1000 ms between external jobs.",
  næringskode: "industry code",
  næringskoder: "industry codes",
  "og ønsker å høre om dere har planer for nettsiden eller de digitale løsningene deres.":
    "and wondered whether you have plans for your website or digital tools.",
  område: "region",
  oppfølgingsdato: "follow-up date",
  "oppføringer med eksakt organisasjonsnummer. Frivillig vedlikeholdt; nettstedet må bekreftes separat.":
    "entries with the exact organization number. Community maintained; website association requires separate verification.",
  "registertreff · side": "registry results · page",
  "rules: 0–30 poeng per faktor, samlet score begrenses til 100. Ukjent nettside får ingen score.":
    "rules: 0–30 points per factor, capped at 100. Unknown websites receive no score.",
  "tidligere importerte utelatt fra denne siden.":
    "previously imported companies excluded from this page.",
  "ugyldige rader.": "invalid rows.",
  "ugyldige/inaktive og": "invalid/inactive and",
  "· 25 per side": "· 25 per page",
  "· Manuelt bekreftet": "· Manually confirmed",
  "· Registrert": "· Added",
  Åpne: "Open",
  "Åpne e-postprogram med utkast": "Open email client with draft",
  "Åpne eksisterende kundekobling": "Open linked client",
  "Åpne kunde →": "Open client →",
  "Åpne køen": "Open queue",
  "Åpne verifiserte bedrifter": "View Verified Companies",
  "Én kontroll om gangen. Hold denne siden åpen. Lukking stanser nye jobber; gjeldende kontroll kan fullføre. Fremdriften er lagret og kan fortsettes her. Pause/avslutt gjelder etter gjeldende kontroll. Vent ett minutt før du prøver samme bedrift på nytt.":
    "One check at a time. Keep this page open to process the queue. Closing it stops new jobs; the current check may finish. Progress is saved. Pause and stop apply after the current check. Wait one minute before retrying a company.",
  "Én nettsideanalyse om gangen. HTTP(S), offentlig IPv4, maksimalt 1 MB HTML og tre omdirigeringer. Automatiske forespørsler respekterer robots.txt konservativt.":
    "One audit at a time. HTTP(S), public IPv4, up to 1 MB HTML and three redirects. Automated requests conservatively respect robots.txt.",
  "← Forrige": "← Previous",
  ": finnes allerede": ": already exists",
  ": kontaktreservasjon": ": do-not-contact restriction",
  "). Bruk manuell vurdering.": "). Review manually.",
};
export function leadSystemText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (messages[normalized]) return messages[normalized];
  // Preserve manually authored confirmation evidence after the system prefix.
  for (const prefix of [
    "Bedriftstilknytning bekreftet manuelt:",
    "Manuell bekreftelse:",
  ]) {
    if (text.startsWith(prefix))
      return messages[prefix] + text.slice(prefix.length);
  }
  let result = text
    .replace(
      /Fant (\d+) H1-elementer i den hentede HTML-koden\./g,
      "Found $1 H1 elements in the fetched HTML.",
    )
    .replace(
      /(\d+) av (\d+) bilder mangler alt-attributt i HTML-koden\./g,
      "$1 of $2 images lack an alt attribute in the HTML.",
    );
  for (const [before, after] of Object.entries(messages)
    .filter(([key]) => key.length > 12)
    .sort((a, b) => b[0].length - a[0].length))
    result = result.replaceAll(before, after);
  return result;
}

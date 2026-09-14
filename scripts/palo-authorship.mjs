import path from "node:path";

const creator = "Fabrizio Degni";

// Apply attribution to every published HTML surface, including generated docs,
// standalone tools and the Vite shell. Keep third-party source credits intact.
export function addPaloAuthorship(html, file) {
  const asset = (target) => path.posix.relative(path.posix.dirname(file), target);
  const profile = `${asset("PALO_Community.html")}#creator`;
  const nameLink = `<a href="${profile}">${creator}</a>`;
  const italian = /<html\b[^>]*\blang=["']it(?:-[^"']*)?["']/i.test(html);

  const authorMeta = `<meta name="author" content="${creator}">`;
  if (/<meta\b[^>]*\bname=["']author["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\b[^>]*\bname=["']author["'][^>]*>/gi, authorMeta);
  } else {
    html = html.replace(/<\/head>/i, `    ${authorMeta}\n</head>`);
  }
  if (!html.includes('data-palo-authorship-style="true"')) {
    html = html.replace(/<\/head>/i, `    <link rel="stylesheet" href="${asset("assets/palo-authorship.css")}" data-palo-authorship-style="true">\n</head>`);
  }

  if (file === "index.html" && !html.includes('data-palo-authorship="hero"')) {
    html = html.replace(/(<p class="palo-home-hero-lead">[\s\S]*?<\/p>)/,
      `$1\n                    <p class="palo-authorship-byline" data-palo-authorship="hero">PALO Framework is an open-source project conceived, created and maintained by ${nameLink}.</p>`);
  }

  if (file === "PALO_Community.html" && !html.includes('id="creator"')) {
    const section = `
        <section class="palo-creator-section" id="creator" aria-labelledby="creator-title">
            <div class="palo-creator-content">
                <div><p class="palo-creator-eyebrow">Creator &amp; maintainer</p><h2 id="creator-title">${creator}</h2></div>
                <div>
                    <p>Fabrizio Degni conceived and created PALO Framework and continues to maintain the project, including its methodology, software and documentation. PALO was also the subject of his doctoral thesis in Computer Science at the European Institute of Management and Technology (EIMT). PALO welcomes community contributions and review.</p>
                    <nav class="palo-creator-links" aria-label="Creator links">
                        <a href="https://www.linkedin.com/in/fdegni/" target="_blank" rel="noopener noreferrer">LinkedIn profile</a>
                        <a href="https://github.com/sev7enITA/PALOframework" target="_blank" rel="noopener noreferrer">Project repository</a>
                        <a href="PALO_Recognition.html#doctoral-thesis">Doctoral thesis</a>
                        <a href="PALO_Recognition.html">Publications &amp; public record</a>
                    </nav>
                </div>
            </div>
        </section>`;
    html = html.replace(/(<main\b[\s\S]*?<\/section>)/i, `$1\n${section}`);
    html = html.replace(/Contact the maintainers/g, "Contact the maintainer");
  }

  if (file === "PALO_Recognition.html" && !html.includes('data-palo-authorship="recognition"')) {
    html = html.replace(/(<p class="palo-recognition-hero-lead">[\s\S]*?<\/p>)/,
      `$1\n                        <p class="palo-authorship-byline" data-palo-authorship="recognition">PALO Framework was conceived and created by ${nameLink}, who continues to maintain the project.</p>`);
  }

  if (!html.includes('data-palo-authorship="footer"')) {
    const copy = italian
      ? `PALO Framework: ideato, creato e mantenuto da ${nameLink}.`
      : `PALO Framework: conceived, created and maintained by ${nameLink}.`;
    const footer = `<p class="palo-authorship-footer" data-palo-authorship="footer">${copy}</p>`;
    // Some older modules use a div as their footer. In both layouts, insert
    // before its current content rather than trying to match nested end tags.
    const footerOpen = /<(?:footer\b[^>]*|div\b[^>]*\bclass=["']palo-footer["'][^>]*)>/i;
    if (footerOpen.test(html)) {
      html = html.replace(footerOpen, (tag) => `${tag.slice(0, -1)} data-palo-authorship-container="true">\n${footer}\n`);
    } else {
      const hubClass = file === "governance-hub/index.html" ? ' class="palo-authorship-hub-footer"' : "";
      html = html.replace(/<\/body>/i, `<footer${hubClass} data-palo-authorship-container="true">${footer}</footer>\n</body>`);
    }
  }
  return html;
}

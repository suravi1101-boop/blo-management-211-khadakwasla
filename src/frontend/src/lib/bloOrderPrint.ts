// BLO नियुक्ती आदेश — Print Template
// Complete rewrite — verbatim Marathi government format

import type { OrderSettings } from "@/backend";
import type { createActor } from "@/backend";
import {
  getOrderSettings,
  incrementOutwardCounter,
} from "@/lib/backendService";

export interface BLOForPrint {
  id?: string;
  name: string;
  designation?: string;
  office?: string;
  officeAddress?: string;
  partNumber?: string;
  pollingStationNumber?: string;
  pollingStationName?: string;
  pollingStationId?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  constituencyId?: string;
  status?: string;
  honorariumEligible?: boolean;
  noticeCount?: bigint;
}

// Convert ASCII digits to Devanagari
const toDevanagari = (s: string): string =>
  s.replace(/[0-9]/g, (d) => "०१२३४५६७८९"[Number.parseInt(d)]);

// Format date as DD/MM/YYYY in Devanagari
function toMarathiDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${toDevanagari(day)}/${toDevanagari(month)}/${toDevanagari(year)}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOrderHTML(
  blo: BLOForPrint,
  settings: OrderSettings,
  outwardNumber: number,
  dateStr: string,
  constituencyName: string,
): string {
  const h1 = settings.orderHeaderLine1 || "";
  const h2 = settings.orderHeaderLine2 || "";
  const phone = settings.orderHeaderPhone || "";
  const email = settings.orderHeaderEmail || "";
  const officerName = settings.orderOfficerName || "";
  const officerDesig = settings.orderOfficerDesignation || "";
  const officerConst = settings.orderOfficerConstituency || "";
  const officerTehsil = settings.orderOfficerTehsil || "";

  const bloNameDesig = [blo.name || "", blo.designation || ""]
    .filter(Boolean)
    .join(" ");
  const officeAddr = blo.officeAddress || blo.office || "";
  const partNum =
    blo.partNumber || blo.pollingStationNumber || blo.pollingStationId || "";
  const partName =
    blo.pollingStationName ||
    (blo as BLOForPrint & { partName?: string }).partName ||
    "";
  const outwardStr = toDevanagari(String(outwardNumber));

  const sigBlock = `
    <div class="footer-sig">
      <div class="sig-block">
        <div class="sig-line"></div>
        <p style="margin:0;font-size:12pt;"><strong>${escapeHtml(officerName)}</strong></p>
        <p style="margin:0;font-size:11pt;">${escapeHtml(officerDesig)}</p>
        <p style="margin:0;font-size:11pt;">${escapeHtml(officerConst)}</p>
        ${officerTehsil ? `<p style="margin:0;font-size:11pt;">${escapeHtml(officerTehsil)}</p>` : ""}
        <p style="margin:4px 0 0 0;font-size:11pt;">दिनांक: ______________</p>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8" />
  <title>BLO नियुक्ती आदेश</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans Devanagari', serif;
      font-size: 10.5pt;
      line-height: 1.35;
      color: #000;
      background: #fff;
    }
    /* Each page is a self-contained wrapper */
    .page-wrapper {
      width: 100%;
      min-height: 1px;
    }
    .header-box {
      border: 2px solid #000;
      padding: 4px 8px;
      text-align: center;
      margin-bottom: 6px;
    }
    .header-box .line1 { font-size: 12pt; font-weight: 700; line-height: 1.4; }
    .header-box .line2 { font-size: 10.5pt; line-height: 1.3; }
    .header-box .line3 { font-size: 10pt; line-height: 1.3; }
    .ref-block {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border: 1px solid #000;
      padding: 3px 8px;
      margin-bottom: 6px;
      font-size: 10.5pt;
      line-height: 1.35;
    }
    .ref-block .ref-left { font-weight: 600; }
    .ref-block .ref-right { text-align: right; }
    .ref-block .ref-right p { margin: 0; }
    .vishay {
      text-align: center;
      margin-bottom: 6px;
      font-size: 11.5pt;
      text-decoration: underline;
    }
    .section-label {
      font-weight: 700;
      font-size: 11pt;
      text-align: left;
      margin-top: 4px;
      margin-bottom: 2px;
    }
    .sandarva-list {
      margin: 0 0 4px 0;
      padding: 0 0 0 20px;
      list-style: none;
      text-align: left;
    }
    .sandarva-list li {
      margin-bottom: 1px;
      line-height: 1.3;
      text-indent: -20px;
      padding-left: 20px;
    }
    .adesh-heading {
      font-weight: 700;
      font-size: 10.5pt;
      text-decoration: underline;
      margin-top: 4px;
      margin-bottom: 3px;
      display: block;
    }
    .adesh-para {
      text-align: justify;
      margin-bottom: 4px;
      line-height: 1.35;
    }
    table.blo-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
      font-size: 10pt;
    }
    table.blo-table th,
    table.blo-table td {
      border: 1px solid #000;
      padding: 2px 4px;
      text-align: left;
      vertical-align: top;
      line-height: 1.25;
    }
    table.blo-table th {
      font-weight: 700;
      background-color: #f0f0f0;
      text-align: center;
    }
    table.blo-table td:first-child { text-align: center; width: 7%; }
    table.blo-table td:nth-child(4),
    table.blo-table td:nth-child(5) { text-align: center; }
    .ati-label { font-weight: 700; margin-top: 4px; margin-bottom: 2px; }
    .ati-list { margin: 0; padding: 0; list-style: none; }
    .ati-list li { margin-bottom: 1px; line-height: 1.3; text-align: justify; }
    .footer-sig { text-align: right; margin-top: 16px; }
    .sig-block { display: inline-block; text-align: center; min-width: 200px; }
    .sig-line { border-top: 1px solid #000; width: 200px; margin-bottom: 4px; }
    .prat-label { font-weight: 700; font-size: 12pt; margin-bottom: 8px; }
    .prat-item { line-height: 1.5; text-align: justify; margin-bottom: 4px; }
    @media print {
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-1 { page-break-after: always; }
      .page-2 { page-break-before: always; }
    }
  </style>
</head>
<body>

  <!-- PAGE 1 -->
  <div class="page-wrapper page-1">

    <!-- HEADER BOX -->
    <div class="header-box">
      <div class="line1">${escapeHtml(h1)}</div>
      <div class="line2">${escapeHtml(h2)}</div>
      <div class="line3">संपर्क क्रमांक: ${escapeHtml(phone)} | ई-मेल: ${escapeHtml(email)}</div>
    </div>

    <!-- जा.क्र. AND DATE -->
    <div class="ref-block">
      <span class="ref-left">निवडणूक / महत्वाचे</span>
      <div class="ref-right">
        <p>क्र. निवडणूक/कावि/${outwardStr}/२०२६</p>
        <p>पुणे, दिनांक ${dateStr}</p>
      </div>
    </div>

    <!-- SUBJECT — centered -->
    <div class="vishay">
      <strong>विषय:</strong> मतदान केंद्रस्तरीय अधिकारी (BLO) नियुक्ती बाबत.
    </div>

    <!-- REFERENCES -->
    <div class="section-label">संदर्भ:</div>
    <ul class="sandarva-list">
      <li>१) लोकप्रतिनिधित्व अधिनियम- १९५० चे कलम १३ब</li>
      <li>२) भारत निवडणूक आयोगाचे पत्र कर. २३/बिएलओ/२०२२-ईआरएस दि. ०४ ऑक्टोबर, २०२२</li>
      <li>३) भारत निवडणूक आयोगाचे पत्र कर. २३/बिएलओ/२०२५-ईआरएस दि. ०५ जून, २०२५</li>
      <li>४) मा. मुख्य निवडणूक अधिकारी, महारष्ट्र राज्य यांचे पत्र क्र. ईएलआर-२०२५/प्र.क्र.४०/(नि-६), दि. ०६ जून, २०२५.</li>
    </ul>

    <!-- ORDER BODY — separate paragraphs -->
    <span class="adesh-heading">आदेश,</span>

    <p class="adesh-para">ज्या अर्थी लोकप्रतिनिधित्व अधिनियम 1950 च्या कलम 13 (ब) १ नुसार विधानसभा मतदारसंघाच्या मतदार नोंदणी अधिकारी यांच्याकडे मतदार याद्या तयार करणे तसेच त्यांचे पुनरिक्षण करणे याबाबतची जबाबदारी सोपवण्यात आलेली आहे तसेच त्याच अधिनियमातील कलम 13 ब (२) नुसार उपरोक्त कर्तव्य पार पाडण्याकरिता मतदार नोंदणी अधिकारी निश्चित केलेल्या निर्बंधाच्या अधीन राहून त्यांना योग्य वाटेल इतक्या व्यक्तींची नियुक्ती करू शकतो</p>

    <p class="adesh-para">ज्या अर्थी भारत निवडणूक आयोगाच्या संदर्भीय पत्रांवर मतदान केंद्रस्तरीय अधिकारी (Booth Level Officer) ची नियुक्ती करण्याबाबत निर्देश देण्यात आलेले आहेत.</p>

    <p class="adesh-para">त्या अर्थी मी मतदार नोंदणी अधिकारी ${escapeHtml(constituencyName)} मतदारसंघ मला प्राप्त अधिकारात लोकप्रतिनिधित्व अधिनियम 1950 चे कलम 13 ब (२) अन्वये खाली नमूद कर्मचाऱ्यास खालील अटींच्या अधीन राहून त्यांच्या नावासमोर दर्शविलेल्या मतदान केंद्राकरिता मतदान केंद्रस्तरीय अधिकारी म्हणून नियुक्त करत आहे.</p>

    <!-- BLO TABLE -->
    <table class="blo-table">
      <thead>
        <tr>
          <th>अ.क्र.</th>
          <th>कर्मचाऱ्याचे नाव व पदनाम</th>
          <th>कर्मचारी कार्यरत असलेल्या कार्यालयाचे नाव व पत्ता</th>
          <th>नियुक्त केलेला यादिभाग क्रमांक</th>
          <th>नियुक्त केलेल्या यादिभागाचे नाव</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>१</td>
          <td>${escapeHtml(bloNameDesig)}</td>
          <td>${escapeHtml(officeAddr)}</td>
          <td>${escapeHtml(partNum)}</td>
          <td>${escapeHtml(partName)}</td>
        </tr>
      </tbody>
    </table>

    <!-- TERMS -->
    <div class="ati-label">अटी-</div>
    <ul class="ati-list">
      <li>(१) या आदेशान्वये नियुक्त करण्यात आलेल्या कर्मचाऱ्यांनी तातडीने मतदान केंद्रेस्तीय स्तरीय अधिकारी पदाची अतिरिक्त जबाबदारी स्वीकारणे बंधनकारक आहे.</li>
      <li>(२) संबंधित कर्मचाऱ्यांनी आपल्या नियमित पदाचे कर्तव्य सांभाळून मतदान केंद्रस्तरीय अधिकारी या पदाची कर्तव्य पार पाडावयाची आहेत.</li>
      <li>३) संबंधित कर्मचारी शिक्षक संवर्गातील असल्यास माननीय सर्वोच्च न्यायालयाने अपील (सिव्हिल) ५६५९/२००७ (भारत निवडणूक आयोग वि. सेंट मेरी स्कूल व इतर) या प्रकरणात दिलेल्या निर्णयाच्या अधिन सदर नियुक्ती असेल.</li>
      <li>४) बालकांचा मोफत व सक्तीच्या शिक्षणावरील अधिकार अधिनियम २००९ मधील कलम २७ नुसार शिक्षकांना निवडणूक विषयक कामकाजासाठी नियुक्त करण्यास कोणताही प्रतिबंध नाही.</li>
      <li>५) सबब सर्व मतदान केंद्रस्तरीय अधिकारी यांनी त्यांना नेमून दिलेले काम विहित कालावधीत पूर्ण करावयाचे आहे.</li>
    </ul>

    <p class="adesh-para" style="margin-top:10px;">सदर आदेशाची अंमलबजावणी न झाल्यास किंवा संबंधितांनी हलगर्जीपणा अगर टाळाटाळ केल्याचे आढळून आल्यास लोकप्रतिनिधित्व अधिनियम १९५० च्या कलम ३२ नुसार संबंधित कर्मचारी कारवाईस पात्र राहतील याची कृपया नोंद घ्यावी.</p>

    ${sigBlock}
  </div>

  <!-- PAGE 2 — प्रत: SECTION -->
  <div class="page-wrapper page-2">
    <div class="prat-label">प्रत:</div>
    <p class="prat-item">१) संबंधित अधिकारी कर्मचारी व संबंधित कार्यालय प्रमुख यांच्याकडे माहिती करिता तसेच आवश्यक कारवाईसाठी सदर आदेश संबंधित कर्मचारी अधिकारी यांना बजावून तात्काळ आपल्या नियमित कर्तव्यसमोर मतदार नोंदणी अधिकारी पदाचे कर्तव्य स्वीकारण्याच्या सूचना देण्यात याव्यात जर सदर आदेशात नमूद अधिकारी कर्मचाऱ्यांनी तात्काळ उपरोक्त जबाबदारीने स्वीकारल्यास संबंधित कर्मचाऱ्यांविरुद्ध लोकप्रतिनिधित्व अधिनियम १९५० चे कलम ३२ नुसार कार्यवाही करण्यात येईल याची नोंद घ्यावी.</p>
    ${sigBlock}
  </div>

</body>
</html>`;
}

export async function printBLOOrder(
  actor: ReturnType<typeof createActor> | null | undefined,
  constituencyId: string,
  blo: BLOForPrint,
  constituencyName?: string,
): Promise<void> {
  if (!actor) {
    alert("Backend connection error. Please try again.");
    return;
  }

  try {
    const [settings, outwardNumber] = await Promise.all([
      getOrderSettings(actor, constituencyId),
      incrementOutwardCounter(actor, constituencyId),
    ]);

    const finalSettings: OrderSettings = settings ?? {
      constituencyId,
      orderHeaderLine1: "",
      orderHeaderLine2: "",
      orderHeaderPhone: "",
      orderHeaderEmail: "",
      orderOfficerName: "",
      orderOfficerDesignation: "",
      orderOfficerConstituency: "",
      orderOfficerTehsil: "",
      updatedAt: BigInt(0),
    };

    const dateStr = toMarathiDate(new Date());
    const resolvedConstituencyName = constituencyName ?? constituencyId;
    const html = buildOrderHTML(
      blo,
      finalSettings,
      outwardNumber,
      dateStr,
      resolvedConstituencyName,
    );

    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) {
      alert("कृपया browser मध्ये popup blocker बंद करा.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for fonts to load then print — use a single trigger only
    let printTriggered = false;
    const triggerPrint = () => {
      if (printTriggered) return;
      printTriggered = true;
      printWindow.focus();
      printWindow.print();
    };

    printWindow.onload = () => {
      // Give Noto Sans Devanagari font extra time to load from Google Fonts
      setTimeout(triggerPrint, 1200);
    };

    // Fallback if onload does not fire within 3 seconds
    setTimeout(() => {
      if (printWindow && !printWindow.closed) {
        triggerPrint();
      }
    }, 3000);
  } catch (err) {
    console.error("printBLOOrder error:", err);
    alert("आदेश प्रिंट करताना त्रुटी आली. पुन्हा प्रयत्न करा.");
  }
}

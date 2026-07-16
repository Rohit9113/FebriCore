"use client";
// src/components/BillPDF.jsx
import {
  Document, Page, View, Text, StyleSheet, Font, pdf,
} from "@react-pdf/renderer";

Font.register({
  family: "Kalam",
  fonts: [
    { src: "/fonts/Kalam-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/Kalam-Bold.ttf",    fontWeight: "bold"   },
  ],
});

export const SHOP = {
  name:    "Guru Febrication",
  nameHi:  "गुरु वेल्डिंग वर्कशॉप",
  tagline: "लोहे की मजबूती, भरोसे की गारंटी",
  services: "दरवाज़ा • ग्रिल • पाइप गेट • स्टील गेट • स्टील ग्रिल • शेड • चैनल गेट",
  addressHi:    "जलतांडा चौक, हरुहप्पा, कर्रा - खूंटी रोड, झारखंड - 835210",
  phone:   "+91 9113130488, 7282996121",
};

const PEN_BLUE  = "#1d3fae";
const PEN_RED   = "#b91c1c";
const PEN_GREEN = "#166534";
const INK       = "#1a1a1a";
const PAPER     = "#fdfdfb";

const fmt = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const makeBillNo = (customer) => {
  const idTail = String(customer._id || "").slice(-5).toUpperCase();
  const d = customer.createdAt ? new Date(customer.createdAt) : new Date();
  const ym = `${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `GWW-${ym}-${idTail || "00000"}`;
};

const styles = StyleSheet.create({
  page: { backgroundColor: PAPER, fontFamily: "Helvetica", paddingBottom: 60 },

  watermarkWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  watermarkText: { fontSize: 60, color: "#000000", opacity: 0.05, fontFamily: "Helvetica-Bold", transform: "rotate(-32deg)" },

  header: { paddingTop: 28, paddingHorizontal: 36, paddingBottom: 14, borderBottomWidth: 2.2, borderBottomColor: PEN_BLUE, borderBottomStyle: "solid" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  badge: { width: 46, height: 46, borderRadius: 23, backgroundColor: PEN_BLUE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  badgeTxt: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 18 },
  shopName: { fontSize: 19, fontFamily: "Helvetica-Bold", color: INK, letterSpacing: 0.3 },
  shopNameHi: { fontSize: 11, color: PEN_BLUE, marginTop: 1, fontFamily: "Kalam", fontWeight: "bold" },
  tagline: { fontSize: 8, color: "#6b7280", marginTop: 2, fontFamily: "Kalam" },
  services: { fontSize: 7, color: PEN_BLUE, marginTop: 2, fontFamily: "Kalam", maxWidth: 260 },
  addrBlock: { alignItems: "flex-end", maxWidth: 190 },
  addrEn: { fontSize: 7.5, color: "#374151", textAlign: "right", lineHeight: 1.4 },
  addrHi: { fontSize: 7.5, color: "#374151", textAlign: "right", marginTop: 2, fontFamily: "Kalam" },
  phone: { fontSize: 8, color: PEN_BLUE, marginTop: 3, fontFamily: "Helvetica-Bold", textAlign: "right" },

  billTitleWrap: { alignItems: "center", marginTop: 14, marginBottom: 4 },
  billTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", letterSpacing: 3, color: INK },
  billTitleHi: { fontSize: 9, fontFamily: "Kalam", fontWeight: "bold", color: "#6b7280", marginTop: 1 },

  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 36, marginTop: 10 },
  metaBox: { fontSize: 8.5, color: "#374151" },
  metaLabel: { fontFamily: "Helvetica-Bold", color: INK, fontSize: 8 },
  metaLabelHi: { fontFamily: "Kalam", color: "#6b7280", fontSize: 7.5, marginTop: 0.5 },
  metaValuePen: { fontFamily: "Kalam", fontSize: 11, color: PEN_BLUE, marginTop: 1 },

  custBlock: { marginHorizontal: 36, marginTop: 14, padding: 10, borderWidth: 1, borderColor: "#e5e7eb", borderStyle: "dashed", borderRadius: 4 },
  custRow: { flexDirection: "row", marginBottom: 6 },
  custCol: { flex: 1 },
  custLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  custLabelHi: { fontSize: 7.5, fontFamily: "Kalam", color: "#9ca3af", marginTop: 0.5 },
  custValue: { fontSize: 12, fontFamily: "Kalam", color: PEN_BLUE, marginTop: 2 },

  table: { marginHorizontal: 36, marginTop: 16 },
  tHeadRow: { flexDirection: "row", backgroundColor: INK, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 3 },
  tHeadCell: { color: "#ffffff", fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  tRow: {
    flexDirection: "row", paddingVertical: 8, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: "#d1d5db", borderBottomStyle: "dashed",
    alignItems: "center",
  },
  tRowAlt: { backgroundColor: "#f4f6fb" },
  cellSno:  { width: "7%",  fontSize: 9, color: "#6b7280", fontFamily: "Helvetica" },
  cellName: { width: "33%", fontSize: 12.5, color: PEN_BLUE, fontFamily: "Kalam" },
  cellPcs:  { width: "12%", fontSize: 12, color: PEN_BLUE, fontFamily: "Kalam", textAlign: "center" },
  cellCalc: { width: "28%", fontSize: 11, color: PEN_BLUE, fontFamily: "Kalam" },
  cellAmt:  { width: "20%", fontSize: 13, color: PEN_BLUE, fontFamily: "Kalam", fontWeight: "bold", textAlign: "right" },

  totalsWrap: { marginHorizontal: 36, marginTop: 6, alignItems: "flex-end" },
  totalsBox: { width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.7, borderBottomColor: "#e5e7eb" },
  totalLabel: { fontSize: 9.5, color: "#374151", fontFamily: "Helvetica" },
  totalValue: { fontSize: 12.5, fontFamily: "Kalam", color: PEN_BLUE },
  grandRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, marginTop: 4, borderTopWidth: 1.4, borderTopColor: INK },
  grandLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK },
  grandValue: { fontSize: 17, fontFamily: "Kalam", fontWeight: "bold", color: PEN_BLUE },
  dueStamp: {
    marginTop: 8, alignSelf: "flex-end", paddingVertical: 5, paddingHorizontal: 14,
    borderWidth: 1.6, borderStyle: "solid", borderRadius: 4, transform: "rotate(-6deg)",
  },
  dueStampTxt: { fontFamily: "Kalam", fontWeight: "bold", fontSize: 13 },

  noteWrap: { marginHorizontal: 36, marginTop: 22 },
  noteHi: { fontSize: 10.5, fontFamily: "Kalam", color: "#374151" },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 36, paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  thanks: { fontSize: 11, fontFamily: "Kalam", fontWeight: "bold", color: PEN_BLUE },
  thanksSub: { fontSize: 7, color: "#9ca3af", marginTop: 2 },

  signBlock: { alignItems: "center" },
  signature: {
    fontFamily: "Kalam",
    fontWeight: "bold",
    fontSize: 22,
    color: INK,
    transform: "rotate(-4deg) skewX(-8deg)",
    marginBottom: -2,
  },
  signLine: { width: 130, borderTopWidth: 1, borderTopColor: "#9ca3af", marginTop: 8, paddingTop: 3 },
  signLabel: { fontSize: 7, color: "#6b7280", textAlign: "center" },
});

function ItemRow({ item, idx }) {
  const isContract = item.pricingType === "contract";
  return (
    <View style={[styles.tRow, idx % 2 === 1 ? styles.tRowAlt : null]}>
      <Text style={styles.cellSno}>{idx + 1}</Text>
      <Text style={styles.cellName}>
        {item.name}{item.pieces > 1 ? `  (${item.pieces} pc)` : ""}
      </Text>
      <Text style={styles.cellPcs}>{isContract ? "-" : `${item.weightKg} kg`}</Text>
      <Text style={styles.cellCalc}>
        {isContract ? "Contract (fixed)" : `${item.ratePerKg}/kg`}
      </Text>
      <Text style={styles.cellAmt}>{fmt(item.total)}</Text>
    </View>
  );
}

// ── Main document ───────────────────────────────────────────────────
export function BillDocument({ customer, billNo }) {
  const due = customer.dueAmount || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        <View style={styles.watermarkWrap} fixed>
          <Text style={styles.watermarkText}>{SHOP.name.toUpperCase()}</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.badge}><Text style={styles.badgeTxt}>GF</Text></View>
              <View>
                <Text style={styles.shopName}>{SHOP.name}</Text>
                <Text style={styles.shopNameHi}>{SHOP.nameHi}</Text>
                <Text style={styles.tagline}>{SHOP.tagline}</Text>
                <Text style={styles.services}>{SHOP.services}</Text>
              </View>
            </View>
            <View style={styles.addrBlock}>
              <Text style={styles.addrHi}>{SHOP.addressHi}</Text>
              <Text style={styles.phone}>Ph: {SHOP.phone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.billTitleWrap}>
          <Text style={styles.billTitle}>INVOICE</Text>
        </View>

        {/* Bill No / Date */}
        <View style={styles.metaRow}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>BILL NO.</Text>
            <Text style={styles.metaLabelHi}>बिल नंबर</Text>
            <Text style={styles.metaValuePen}>{billNo}</Text>
          </View>
          <View style={[styles.metaBox, { alignItems: "flex-end" }]}>
            <Text style={styles.metaLabel}>DATE</Text>
            <Text style={styles.metaLabelHi}>तारीख</Text>
            <Text style={styles.metaValuePen}>{fmtDate(customer.workDate)}</Text>
          </View>
        </View>

        {/* Customer block */}
        <View style={styles.custBlock}>
          <View style={styles.custRow}>
            <View style={styles.custCol}>
              <Text style={styles.custLabel}>Customer Name</Text>
              <Text style={styles.custLabelHi}>नाम</Text>
              <Text style={styles.custValue}>{customer.name}</Text>
            </View>
            <View style={styles.custCol}>
              <Text style={styles.custLabel}>Phone</Text>
              <Text style={styles.custLabelHi}>फ़ोन</Text>
              <Text style={styles.custValue}>{customer.phone}</Text>
            </View>
          </View>
          <View style={styles.custRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.custLabel}>Address</Text>
              <Text style={styles.custLabelHi}>पता</Text>
              <Text style={styles.custValue}>{customer.address || "-"}</Text>
            </View>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tHeadRow}>
            <Text style={[styles.tHeadCell, { width: "7%" }]}>#</Text>
            <Text style={[styles.tHeadCell, { width: "33%" }]}>Item</Text>
            <Text style={[styles.tHeadCell, { width: "12%" }]}>Weight</Text>
            <Text style={[styles.tHeadCell, { width: "28%" }]}>Rate</Text>
            <Text style={[styles.tHeadCell, { width: "20%", textAlign: "right" }]}>Amount</Text>
          </View>
          {(customer.items || []).map((item, idx) => (
            <ItemRow key={idx} item={item} idx={idx} />
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>{fmt(customer.totalAmount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Paid</Text>
              <Text style={[styles.totalValue, { color: PEN_GREEN }]}>{fmt(customer.paidAmount)}</Text>
            </View>
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>Balance Due</Text>
              <Text style={[styles.grandValue, { color: due > 0 ? PEN_RED : PEN_GREEN }]}>{fmt(due)}</Text>
            </View>
          </View>

          {due > 0 ? (
            <View style={[styles.dueStamp, { borderColor: PEN_RED }]}>
              <Text style={[styles.dueStampTxt, { color: PEN_RED }]}>बाकी है</Text>
            </View>
          ) : (
            <View style={[styles.dueStamp, { borderColor: PEN_GREEN }]}>
              <Text style={[styles.dueStampTxt, { color: PEN_GREEN }]}>भुगतान हो गया ✓</Text>
            </View>
          )}
        </View>

        {/* Note */}
        {customer.description ? (
          <View style={styles.noteWrap}>
            <Text style={styles.custLabel}>Note</Text>
            <Text style={styles.noteHi}>{customer.description}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.thanks}>धन्यवाद! फिर से पधारें</Text>
              <Text style={styles.thanksSub}>{SHOP.name} — Computer generated bill</Text>
            </View>
            <View style={styles.signBlock}>
              <Text style={styles.signature}>Rohit</Text>
              <View style={styles.signLine}>
                <Text style={styles.signLabel}>Authorized Signature</Text>
              </View>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}

// ── Helper: generate + trigger a browser download ───────────────────
export async function downloadBill(customer) {
  const billNo = makeBillNo(customer);
  const blob   = await pdf(<BillDocument customer={customer} billNo={billNo} />).toBlob();

  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url;
  a.download = `${billNo}-${customer.name.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
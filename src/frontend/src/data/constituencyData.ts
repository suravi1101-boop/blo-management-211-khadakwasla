// CRITICAL: id MUST be the numeric string matching the official Vidhan Sabha number.
// ANY non-numeric id here will break all backend read/write — 145+ build failures confirmed this.
export interface Constituency {
  id: string; // e.g. '211' — MUST be numeric string
  number: number; // same as id but as number, e.g. 211
  name: string; // Marathi name
  marathiName?: string; // alias for compatibility
}

export const PUNE_CONSTITUENCIES: Constituency[] = [
  { id: "211", number: 211, name: "खडकवासला", marathiName: "खडकवासला" },
  { id: "212", number: 212, name: "पुणे कॅन्टोन्मेंट", marathiName: "पुणे कॅन्टोन्मेंट" },
  { id: "213", number: 213, name: "शिवाजीनगर", marathiName: "शिवाजीनगर" },
  { id: "214", number: 214, name: "कोथरूड", marathiName: "कोथरूड" },
  { id: "215", number: 215, name: "कसबा पेठ", marathiName: "कसबा पेठ" },
  { id: "216", number: 216, name: "परवती", marathiName: "परवती" },
  { id: "217", number: 217, name: "हडपसर", marathiName: "हडपसर" },
  { id: "218", number: 218, name: "पुणे-मुंढवा", marathiName: "पुणे-मुंढवा" },
  { id: "219", number: 219, name: "भोसरी", marathiName: "भोसरी" },
  { id: "220", number: 220, name: "चिंचवड", marathiName: "चिंचवड" },
  { id: "221", number: 221, name: "पिंपरी", marathiName: "पिंपरी" },
  { id: "222", number: 222, name: "उरळी-देवाची", marathiName: "उरळी-देवाची" },
  { id: "223", number: 223, name: "भोर", marathiName: "भोर" },
  { id: "224", number: 224, name: "पुरंदर", marathiName: "पुरंदर" },
  { id: "225", number: 225, name: "बारामती", marathiName: "बारामती" },
  { id: "226", number: 226, name: "दौंड", marathiName: "दौंड" },
  { id: "227", number: 227, name: "इंदापूर", marathiName: "इंदापूर" },
  { id: "228", number: 228, name: "मावळ", marathiName: "मावळ" },
  { id: "229", number: 229, name: "जुन्नर", marathiName: "जुन्नर" },
  { id: "230", number: 230, name: "अंबेगाव", marathiName: "अंबेगाव" },
  { id: "231", number: 231, name: "खेड-आळंदी", marathiName: "खेड-आळंदी" },
];

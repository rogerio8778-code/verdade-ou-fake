import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase"; // Importa a instância do Firestore

interface NPSFeedbackParams {
  score: number | null;
  comment: string;
  auditId: string;
  userId?: string;
  engineVersion?: string;
  methodologyVersion?: string;
  rulesetId?: string;
  rulesetRevision?: number;
}

const NPS_COLLECTION = "nps_feedback";

/**
 * Salva o feedback NPS no Firestore.
 * @param params Os parâmetros do feedback, incluindo score, comment, auditId e informações opcionais.
 * @returns Um objeto indicando o sucesso da operação ({ ok: true } ou { ok: false }).
 */
export async function saveNPSFeedback(params: NPSFeedbackParams): Promise<{ ok: boolean }> {
  try {
    const { score, comment, auditId, userId, engineVersion, methodologyVersion, rulesetId, rulesetRevision } = params;

    const feedbackDoc = {
      score: score,
      comment: comment,
      auditId: auditId,
      createdAt: serverTimestamp(),
      userId: userId ?? null,
      engineVersion: engineVersion ?? null,
      methodologyVersion: methodologyVersion ?? null,
      rulesetId: rulesetId ?? null,
      rulesetRevision: (typeof rulesetRevision === "number" ? rulesetRevision : null),
    };

    const ref = collection(db, NPS_COLLECTION);
    const docRef = await addDoc(ref, feedbackDoc);
    console.log("[NPS] salvo na raiz:", docRef.id);
    return { ok: true };
  } catch (error) {
    console.error("[NPS] erro:", error);
    return { ok: false };
  }
}

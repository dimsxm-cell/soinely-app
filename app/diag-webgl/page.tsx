// PAGE DE DIAGNOSTIC TEMPORAIRE — a supprimer une fois la cause identifiee.
// Publique (hors matcher du proxy) pour etre ouverte depuis un telephone.
import { DiagnosticWebGL } from "./DiagnosticWebGL";

export const metadata = { robots: { index: false, follow: false } };

export default function PageDiagWebGL() {
  return <DiagnosticWebGL />;
}

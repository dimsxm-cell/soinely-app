/**
 * Fond décoratif animé de l'en-tête « Ma tournée » : trois nappes violettes
 * qui dérivent lentement, évoquant la matière liquide de la maquette.
 *
 * En CSS pur, et non en WebGL. La bibliothèque `threejs-components` prévue
 * à l'origine échantillonne une texture flottante en filtrage linéaire, ce
 * qu'iOS Safari ne fournit pas (`OES_texture_float_linear` absente) : sur
 * iPhone l'effet s'initialisait sans erreur, tournait à 55 images par
 * seconde, et ne montrait rien. Soinely s'utilisant sur téléphone en
 * tournée, un fond invisible sur iOS n'avait pas de raison d'être.
 *
 * Aucun script, aucune dépendance : le rendu est identique partout, et
 * l'animation s'arrête sous `prefers-reduced-motion`.
 */
export function FondAnime({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`nappes-liquide ${className}`}>
      <span />
      <span />
      <span />
    </div>
  );
}

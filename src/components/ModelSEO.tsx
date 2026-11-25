import { Link } from "react-router-dom";
import SEO from "./SEO";
import lyraSocial from "@/lib/lyra-social.json";
import navaSocial from "@/lib/nava-social.json";
import { LOCALES } from "@/i18n/config";
import { useLocale } from "@/i18n/useLocale";
import {
  MODELS,
  getModel,
  modelHiddenText,
  modelMeta,
  gardenLinkLabel,
  relatedLinksLabel,
} from "@/models/registry";

/**
 * Renders the full SEO surface for a model page:
 *  - <SEO> meta tags (title, description, OG, hreflang)
 *  - Visually-hidden but indexable <h1>, descriptive paragraph and internal
 *    links (garden + related models) that scale automatically as new
 *    entries are added to the model registry.
 *
 * Visually hidden = off-screen (1px clip) — readable by crawlers and
 * assistive tech, no layout impact.
 */
const srOnly: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

interface Props {
  slug: string;
}

const ModelSEO = ({ slug }: Props) => {
  const { locale, localePath } = useLocale();
  const model = getModel(slug);
  if (!model) return null;

  const social = slug === "lyra" ? lyraSocial : slug === "nava" ? navaSocial : null;
  const { title, description } = social ? social.copy[locale] : modelMeta(model, locale);
  const hidden = modelHiddenText(model, locale);
  const others = MODELS.filter((m) => m.slug !== slug);

  const alternates = LOCALES.reduce<Record<string, string>>((acc, l) => {
    acc[l] = social ? `${social.origin}/${l}` : `/${l}/${slug}`;
    return acc;
  }, {});

  return (
    <>
      <SEO
        title={title}
        description={description}
        image={social ? social.origin + social.image : model.ogImage}
        type={social ? "website" : "product"}
        url={social ? `${social.origin}/${locale}` : undefined}
        alternates={social ? { ...alternates, "x-default": social.origin + "/" } : alternates}
      />
      <div style={srOnly} aria-hidden={false}>
        <h1>{model.name}</h1>
        <p>{hidden}</p>
        <nav aria-label={relatedLinksLabel(locale)}>
          <ul>
            <li>
              <a href={`https://www.kolesnikov.studio/${locale}`}>Kolesnikov Studio</a>
            </li>
            {others.map((m) => (
              <li key={m.slug}>
                <a href={`https://${m.slug}.kolesnikov.studio/${locale}`}>
                  {m.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default ModelSEO;
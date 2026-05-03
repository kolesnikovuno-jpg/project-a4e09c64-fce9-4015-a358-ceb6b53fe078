import { Link } from "react-router-dom";
import SEO from "./SEO";
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

  const { title, description } = modelMeta(model, locale);
  const hidden = modelHiddenText(model, locale);
  const others = MODELS.filter((m) => m.slug !== slug);

  const alternates = LOCALES.reduce<Record<string, string>>((acc, l) => {
    acc[l] = `/${l}/${slug}`;
    return acc;
  }, {});

  return (
    <>
      <SEO
        title={title}
        description={description}
        image={model.ogImage}
        type="product"
        alternates={alternates}
      />
      <div style={srOnly} aria-hidden={false}>
        <h1>{model.name}</h1>
        <p>{hidden}</p>
        <nav aria-label={relatedLinksLabel(locale)}>
          <ul>
            <li>
              <Link to={localePath("/garden")}>{gardenLinkLabel(locale)}</Link>
            </li>
            {others.map((m) => (
              <li key={m.slug}>
                <Link to={localePath(`/${m.slug}`)}>
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default ModelSEO;
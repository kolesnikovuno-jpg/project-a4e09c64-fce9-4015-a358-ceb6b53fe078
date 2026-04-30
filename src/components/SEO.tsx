import { useEffect } from "react";

type Props = {
  title: string;
  description: string;
  /** Path relative to site root (e.g. "/og/lyra-preview.png") or absolute https URL */
  image: string;
  type?: string;
  /** Canonical URL. Defaults to current location.href */
  url?: string;
};

const upsertMeta = (selector: string, attrName: string, attrValue: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  const prev = el.getAttribute("content") || "";
  el.setAttribute("content", content);
  return { el, prev };
};

const upsertLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  const prev = el.getAttribute("href") || "";
  el.setAttribute("href", href);
  return { el, prev };
};

/**
 * Sets per-page <title>, description and Open Graph / Twitter meta tags.
 * Restores previous values on unmount so navigating away does not leak meta.
 */
const SEO = ({ title, description, image, type = "website", url }: Props) => {
  useEffect(() => {
    const origin = window.location.origin;
    const absoluteUrl = url || window.location.href;
    const absoluteImage = /^https?:\/\//i.test(image) ? image : origin + image;

    const prevTitle = document.title;
    document.title = title;

    const restorers: Array<() => void> = [];

    const setMeta = (selector: string, attrName: string, attrValue: string, content: string) => {
      const { el, prev } = upsertMeta(selector, attrName, attrValue, content);
      restorers.push(() => {
        if (prev) el.setAttribute("content", prev);
      });
    };

    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:image"]', "property", "og:image", absoluteImage);
    setMeta('meta[property="og:type"]', "property", "og:type", type);
    setMeta('meta[property="og:url"]', "property", "og:url", absoluteUrl);
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", absoluteImage);

    const { el: linkEl, prev: prevHref } = upsertLink("canonical", absoluteUrl);
    restorers.push(() => {
      if (prevHref) linkEl.setAttribute("href", prevHref);
    });

    return () => {
      document.title = prevTitle;
      restorers.forEach((r) => r());
    };
  }, [title, description, image, type, url]);

  return null;
};

export default SEO;
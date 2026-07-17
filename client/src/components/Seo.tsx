import { useEffect } from "react";

export default function Seo(props: { title: string; description?: string }) {
  const { title, description } = props;

  useEffect(() => {
    document.title = title;

    if (description) {
      let el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!el) {
        el = document.createElement("meta");
        el.name = "description";
        document.head.appendChild(el);
      }
      el.content = description;
    }
  }, [title, description]);

  return null;
}

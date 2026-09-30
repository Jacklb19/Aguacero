import Link from "next/link";
import type { RoutePath } from "@/config/routes";
import { footer } from "@/content/copy";
import { RenderNote } from "@/components/render-note/RenderNote";

export function SiteFooter({ route, renderedAt }: { route: RoutePath; renderedAt?: string }) {
  return (
    <footer className="mt-28 border-t border-line bg-paper">
      <div className="container-page flex flex-col gap-6 py-10">
        <RenderNote route={route} {...(renderedAt ? { renderedAt } : {})} />
        <p className="prose-measure text-small text-ash">{footer.attribution}</p>
        <ul className="flex flex-wrap gap-x-6 text-small">
          <li>
            <Link href="/methodology" className="prose-link">
              {footer.methodology}
            </Link>
          </li>
          <li>
            <a href="https://github.com/Jacklb19/Aguacero" className="prose-link">
              {footer.source}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}

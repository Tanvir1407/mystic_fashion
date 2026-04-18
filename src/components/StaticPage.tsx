import { getPageBySlug } from "@/app/admin/actions";
import ContentPageLayout from "@/components/ContentPageLayout";
import { notFound } from "next/navigation";

export default async function StaticPage({ slug, defaultTitle }: { slug: string; defaultTitle: string }) {
  const page = await getPageBySlug(slug);
  
  // If no content in DB, we can show a placeholder or 404
  // The user said admin can change full page content, so we render whatever is in DB.
  
  return (
    <ContentPageLayout title={page?.title || defaultTitle}>
      {page?.content ? (
        <div dangerouslySetInnerHTML={{ __html: page.content }} />
      ) : (
        <div className="text-center py-20">
          <p className="text-slate-400 italic">Content for this page is currently being prepared. Please check back soon.</p>
        </div>
      )}
    </ContentPageLayout>
  );
}

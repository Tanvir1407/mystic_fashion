import prisma from "@/lib/prisma";
import AttributesClient from "./AttributesClient";
import { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Manage Attributes | Mystic Admin",
};

export default async function AttributesPage({ searchParams }: { searchParams: { page?: string; limit?: string } }) {
  const session = await getSession();
  const canView = hasPermission(session, "VIEW", "PRODUCTS");
  const canCreate = hasPermission(session, "CREATE", "PRODUCTS");
  const canEdit = hasPermission(session, "EDIT", "PRODUCTS");
  const canDelete = hasPermission(session, "DELETE", "PRODUCTS");

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md bg-white shadow-none border border-slate-200 rounded-none p-8 text-center flex flex-col items-center animate-fade-in">
          <div className="w-12 h-12 bg-[#800020]/5 rounded-full flex items-center justify-center mb-6">
            <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m3-9a3 3 0 11-6 0 3 3 0 016 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-3">Access Restricted</h2>
          <p className="text-sm text-slate-500 mb-2 leading-relaxed max-w-xs font-normal">
            You do not have permission to view attributes. Please contact your administrator to assign permissions for your working area.
          </p>
        </div>
      </div>
    );
  }

  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const PER_PAGE = [10, 20, 50, 100].includes(limit) ? limit : 10;

  // Fetch all active categories
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  // Fetch paginated attributes, all attributes, and total count in parallel
  const [attributes, allAttributes, totalCount] = await Promise.all([
    prisma.attributeRegistry.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.attributeRegistry.findMany({
      orderBy: { createdAt: "desc" }
    }),
    prisma.attributeRegistry.count(),
  ]);

  // Fetch category attribute mappings
  const mappings = await prisma.categoryAttributeMapping.findMany({
    include: { attribute: true },
    orderBy: { sortOrder: "asc" }
  });

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return (
    <AttributesClient 
      categories={categories}
      attributes={attributes}
      allAttributes={allAttributes}
      mappings={mappings}
      currentPage={page}
      totalPages={totalPages}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}

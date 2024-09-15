"use client";

import { CoverImage } from "@/components/cover";
import { Toolbar } from "@/components/toolbar";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React from "react";

interface DocumentIdPageProps {
  params: {
    documentId: Id<"documents">;
  };
}

const DocumentIdPage = ({ params }: DocumentIdPageProps) => {
  const document = useQuery(api.documents.getById, {
    id: params.documentId,
  });

  if (document === undefined) {
    return <p>Loading...</p>;
  }

  if (document === null) {
    return <p>Document not found</p>;
  }

  return (
    <div className="pb-40">
      <CoverImage url={document.coverImage} />

      {/* below is a temp placeholder (i don't wish to delete) for the cover image */}
      {/* a trick that we can do we create some fillers for now dev'ing the toolbars */}
      {/* <div className="h-[35vh]" /> */}
      <div className="md:max-w-3xl lg:max-w-4xl mx-auto">
        <Toolbar initialData={document} />
      </div>
    </div>
  );
};

export default DocumentIdPage;

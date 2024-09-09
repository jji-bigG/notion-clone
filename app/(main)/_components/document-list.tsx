"use client";

import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import Item from "./item";
import { useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileIcon } from "lucide-react";

interface DocumentListProps {
  parentDocument?: Id<"documents">;
  level?: number;
  data?: Doc<"documents">[];
}

export const DocumentList = ({
  parentDocument,
  level = 0,
  data,
}: DocumentListProps) => {
  const params = useParams();
  const router = useRouter();
  const [expand, setExpand] = useState<Record<string, boolean>>({});

  const onExpand = (id: string) => {
    setExpand((prevExpand) => ({
      ...prevExpand,
      [id]: !prevExpand[id],
    }));
  };

  const documents = useQuery(api.documents.getSidebar, {
    parentDocument: parentDocument,
  });

  const onRedirect = (id: string) => {
    // router.push(`/documents/${id}`);
  };

  if (documents === undefined) {
    return (
      <>
        <Item.Skeleton level={level} />
        <Item.Skeleton level={level} />
      </>
    );
  }

  return (
    <>
      <p
        style={{
          paddingLeft: level ? `${level * 12 + 25}px` : undefined,
        }}
        className={cn(
          "hidden text-sm font-medium text-muted-foreground/80",
          expand && "last:block",
          level === 0 && "hidden"
        )}
      >
        No Changes Inside
      </p>
      {documents.map((doc) => (
        <div key={doc._id}>
          <Item
            id={doc._id}
            onClick={() => onRedirect(doc._id)}
            label={doc.title}
            Icon={FileIcon}
            active={params.documentId === doc._id}
            level={level}
            onExpand={() => onExpand(doc._id)}
            expanded={expand[doc._id]}
          />
          {/* this is the recursive part: conditionally call it to render another */}
          {expand[doc._id] && (
            <DocumentList
              parentDocument={doc._id}
              level={level + 1}
              data={data}
            />
          )}
        </div>
      ))}
    </>
  );
};

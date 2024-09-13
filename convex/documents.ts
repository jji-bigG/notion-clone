import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";

export const archive = mutation({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;

    const existingDoc = await ctx.db.get(args.id);
    if (!existingDoc) {
      throw new Error("Document not found");
    }

    if (existingDoc.userId !== userId) {
      throw new Error("Unauthorized"); // we are logged in, but we just cannot modify it
    }

    // also need to check all of its children: recursive function
    const recursiveArchive = async (docId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentDocument", docId)
        )
        .collect();

      // iterate through all the children and repeat the archive process
      for (const child of children) {
        // only way to do the async await function: need this for loop
        await ctx.db.patch(child._id, {
          isArchived: true,
        });
        await recursiveArchive(child._id);
      }

      await ctx.db.patch(docId, {
        isArchived: true,
      });
    };

    const doc = await ctx.db.patch(args.id, {
      isArchived: true,
    });

    await recursiveArchive(args.id);

    return doc;
  },
});

export const getSidebar = query({
  args: {
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", userId).eq("parentDocument", args.parentDocument)
      )
      .filter((q) => q.eq(q.field("isArchived"), false))
      .order("desc")
      .collect();

    return documents;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.subject;

    const doc = await ctx.db.insert("documents", {
      title: args.title,
      userId,
      parentDocument: args.parentDocument,
      isArchived: false,
      isPublished: false,
    });
    return doc;
  },
});

export const getTrash = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .order("desc")
      .collect();

    return documents;
  },
});

export const restore = mutation({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;

    const existingDoc = await ctx.db.get(args.id);
    if (!existingDoc) {
      throw new Error("Document not found");
    }

    if (existingDoc.userId !== userId) {
      throw new Error("Unauthorized"); // we are logged in, but we just cannot modify it
    }

    const recursiveRestore = async (docId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentDocument", docId)
        )
        .collect();

      // iterate through all the children and repeat the archive process
      for (const child of children) {
        // only way to do the async await function: need this for loop
        await ctx.db.patch(child._id, {
          isArchived: false,
        });
        await recursiveRestore(child._id);
      }
    };

    const options: Partial<Doc<"documents">> = {
      isArchived: false,
    };

    if (existingDoc.parentDocument) {
      options.parentDocument = existingDoc.parentDocument;
    }

    const doc = await ctx.db.patch(args.id, {
      isArchived: false,
    });

    await recursiveRestore(args.id);

    return doc;
  },
});

export const remove = mutation({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;

    const existingDoc = await ctx.db.get(args.id);

    if (!existingDoc) {
      throw new Error("Document not found");
    }

    if (existingDoc.userId !== userId) {
      throw new Error("Unauthorized"); // we are logged in, but we just cannot modify it
    }

    const doc = await ctx.db.delete(args.id);
    return doc;
  },
});

export const search = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .order("desc")
      .collect();
    return documents;
  },
});

export const getById = query({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    const doc = await ctx.db.get(args.id);

    if (!doc) {
      throw new Error("Document not found");
    }

    if (doc.isPublished && !doc.isArchived) {
      return doc;
    }

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    if (doc.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return doc;
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    icon: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;

    const { id, ...data } = args;

    const existingDoc = await ctx.db.get(id);

    if (!existingDoc) {
      throw new Error("Document not found");
    }

    if (existingDoc.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const doc = await ctx.db.patch(id, data);

    return doc;
  },
});

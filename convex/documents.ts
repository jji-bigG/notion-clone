import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";

export const get = query({
  // args: {
  //   id: v.id("documents"),
  // },
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const doc = await ctx.db.query("documents").collect();
    return doc;
  },
});

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

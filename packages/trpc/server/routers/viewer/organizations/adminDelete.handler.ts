import { deleteDomain } from "@calcom/lib/domainManager/organization";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TAdminDeleteInput } from "./adminDelete.schema";

type AdminDeleteOption = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminDeleteInput;
};

export const adminDeleteHandler = async ({ input }: AdminDeleteOption) => {
  const foundOrg = await prisma.team.findUnique({
    where: {
      id: input.orgId,
      metadata: {
        path: ["isOrganization"],
        equals: true,
      },
    },
    include: {
      members: {
        select: {
          user: true,
        },
      },
    },
  });

  if (!foundOrg)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization not found",
    });

  if (foundOrg.slug) {
    await deleteDomain(foundOrg.slug);
  }

  await renameUsersToAvoidUsernameConflicts(foundOrg.members.map((member) => member.user));
  await prisma.team.delete({
    where: {
      id: input.orgId,
    },
  });

  return {
    ok: true,
    message: `Organization ${foundOrg.name} deleted.`,
  };
};

export default adminDeleteHandler;

async function renameUsersToAvoidUsernameConflicts(users: { id: number; username: string | null }[]) {
  for (const user of users) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        username: `${user.username || ""}-${user.id}`,
      },
    });
  }
}

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function seedOrganizations() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
    });

    console.log(`Found ${users.length} users. Starting org backfill...`);

    for (const user of users) {
      // Check if user already has org membership
      const existingMembership = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
      });

      if (existingMembership) {
        console.log(`⏭ Skipped: ${user.email}`);
        continue;
      }

      // Generate API key
      const apiKey = "am_live_" + crypto.randomBytes(32).toString("hex");

      // Create Organization
      const org = await prisma.organization.create({
        data: {
          name: user.name
            ? `${user.name}'s Workspace`
            : `${user.email}'s Workspace`,
          apiKey,
        },
      });

      // Create OrganizationMember
      await prisma.organizationMember.create({
        data: {
          orgId: org.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      // Update all Workflows for this user
      await prisma.workflow.updateMany({
        where: { userId: user.id },
        data: { orgId: org.id },
      });

      // Update all WorkflowRuns for this user
      await prisma.workflowRun.updateMany({
        where: { userId: user.id },
        data: { orgId: org.id },
      });

      console.log(`✅ Created org for: ${user.email}`);
    }

    console.log("Org backfill complete!");
  } catch (error) {
    console.error("Error during org seeding:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedOrganizations();

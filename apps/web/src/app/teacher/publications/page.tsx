import { Panel } from "@eduferma/ui";
import { PlatformShell } from "@/components/platform/app-shell";
import { PublicationCms } from "@/components/platform/publication-cms";
import { requireTeacherAccess } from "@/lib/platform/auth";
import {
  getPublicationProviderHealth,
  listOwnerPublicationTargets,
  listTeacherPublicationTargets,
  listTeacherPublications
} from "@/server/publications/service";

export default async function TeacherPublicationsPage() {
  const user = await requireTeacherAccess();
  const [postsPayload, targetsPayload, healthPayload] = await Promise.all([
    listTeacherPublications(),
    user.role === "owner" ? listOwnerPublicationTargets() : listTeacherPublicationTargets(),
    getPublicationProviderHealth()
  ]);

  return (
    <PlatformShell
      role="teacher"
      title="Публикации"
      subtitle="Учительский CMS для черновиков, расписания, таргетов, истории доставки и безопасных повторных ревизий."
    >
      {targetsPayload.targets.length === 0 ? (
        <Panel>
          <p>Сначала создайте хотя бы один publication target. Для Telegram static target chat ID должен входить в `TELEGRAM_ALLOWED_CHAT_IDS`.</p>
        </Panel>
      ) : null}
      <PublicationCms
        initial={{
          posts: await Promise.all(postsPayload.posts.map((post) => getPublication(post.id))),
          targets: targetsPayload.targets,
          health: healthPayload.health
        }}
        isOwner={user.role === "owner"}
      />
    </PlatformShell>
  );
}

async function getPublication(postId: string) {
  const payload = await import("@/server/publications/service");
  return (await payload.getTeacherPublication(postId)).publication;
}

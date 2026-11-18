import React, { useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { ArtifactPreviewModal } from './components/SharedUI';
import { Sidebar } from './components/Sidebar';
import { EagleProvider, useEagle } from './context/EagleContext';
import { ClientsView } from './views/ClientsView';
import { DashboardView } from './views/DashboardView';
import { DecisionsView } from './views/DecisionsView';
import { FinanceView } from './views/FinanceView';
import {
  AgentsView,
  GoalsView,
  RoutinesView,
  SkillsView,
  TeamView,
} from './views/OrganizationViews';
import { ProjectsView } from './views/ProjectsView';
import { TasksView } from './views/TasksView';
import { ClientPortalApp } from './portal/ClientPortalApp';

function AppWorkspace({ onOpenPortal }: { onOpenPortal: () => void }) {
  const {
    activeSection,
    previewArtifact,
    setPreviewArtifact,
    approveArtifact,
    getMember,
  } = useEagle();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const openMobile = () => setMobileMenuOpen(true);

  const renderSection = () => {
    switch (activeSection) {
      case 'painel':
        return <DashboardView onOpenMobileMenu={openMobile} />;
      case 'tarefas':
        return <TasksView onOpenMobileMenu={openMobile} />;
      case 'decisoes':
        return <DecisionsView onOpenMobileMenu={openMobile} />;
      case 'projetos':
        return <ProjectsView onOpenMobileMenu={openMobile} />;
      case 'clientes':
        return <ClientsView onOpenMobileMenu={openMobile} />;
      case 'financeiro':
        return <FinanceView onOpenMobileMenu={openMobile} />;
      case 'agentes':
        return <AgentsView onOpenMobileMenu={openMobile} />;
      case 'equipe':
        return <TeamView onOpenMobileMenu={openMobile} />;
      case 'rotinas':
        return <RoutinesView onOpenMobileMenu={openMobile} />;
      case 'metas':
        return <GoalsView onOpenMobileMenu={openMobile} />;
      case 'habilidades':
        return <SkillsView onOpenMobileMenu={openMobile} />;
      default:
        return <TasksView onOpenMobileMenu={openMobile} />;
    }
  };

  return (
    <div className="eagle-desk h-screen w-screen overflow-hidden flex p-2 sm:p-3 gap-3 text-[#0f1115] dark:text-[#f2f4f7]">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenPortal={onOpenPortal}
      />

      {/* Folha principal elevada sobre a mesa de trabalho (em Tarefas, as folhas flutuam direto sobre a mesa) */}
      <main
        className={`flex-1 min-w-0 h-full flex flex-col ${
          activeSection === 'tarefas'
            ? 'overflow-visible'
            : 'eagle-sheet-canvas overflow-hidden'
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 min-h-0 flex flex-col"
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </main>

      <GlobalSearchModal />

      {previewArtifact && (
        <ArtifactPreviewModal
          artifact={previewArtifact.artifact}
          author={getMember(previewArtifact.artifact.autorId)}
          onClose={() => setPreviewArtifact(null)}
          onToggleApprove={
            previewArtifact.taskId
              ? () => {
                  const nextApproved = !previewArtifact.artifact.aprovado;
                  approveArtifact(
                    previewArtifact.taskId!,
                    previewArtifact.artifact.id,
                    nextApproved
                  );
                  setPreviewArtifact({
                    ...previewArtifact,
                    artifact: {
                      ...previewArtifact.artifact,
                      aprovado: nextApproved,
                    },
                  });
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

export default function App() {
  const [workspaceMode, setWorkspaceMode] = useState<'studio' | 'portal'>('studio');

  return (
    <MotionConfig reducedMotion="user">
      <EagleProvider>
        {workspaceMode === 'portal' ? (
          <ClientPortalApp onBackToStudio={() => setWorkspaceMode('studio')} />
        ) : (
          <AppWorkspace onOpenPortal={() => setWorkspaceMode('portal')} />
        )}
      </EagleProvider>
    </MotionConfig>
  );
}

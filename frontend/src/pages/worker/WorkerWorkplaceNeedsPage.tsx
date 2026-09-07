import { useEffect, useState } from "react";
import { isAxiosError } from "axios";

import { WorkplaceNeedsPanel } from "../../components/projects/WorkplaceNeedsPanel";
import { useWorkspacePageTitle } from "../../contexts/AdminChromeContext";
import {
  createWorkplaceNeed,
  getWorkplaceNeedContext,
  listMyWorkplaceNeeds,
} from "../../services/projectApi";

import type { ApiErrorResponse } from "../../types/auth";
import type { WorkplaceNeed, WorkplaceNeedContextProject } from "../../types/project";

import "./WorkerPages.css";

export const WorkerWorkplaceNeedsPage = () => {
  useWorkspacePageTitle("Workplace Needs");
  const [workplaceNeeds, setWorkplaceNeeds] = useState<WorkplaceNeed[]>([]);
  const [workplaceNeedProjects, setWorkplaceNeedProjects] = useState<
    WorkplaceNeedContextProject[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadWorkplaceNeeds = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [needsResponse, contextResponse] = await Promise.all([
        listMyWorkplaceNeeds(),
        getWorkplaceNeedContext(),
      ]);
      setWorkplaceNeeds(needsResponse.results);
      setWorkplaceNeedProjects(contextResponse.results);
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        setErrorMessage(
          error.response?.data?.message ?? "Unable to load workplace needs.",
        );
      } else {
        setErrorMessage("Unable to load workplace needs.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSubmitContext = async () => {
    const contextResponse = await getWorkplaceNeedContext();
    setWorkplaceNeedProjects(contextResponse.results);
  };

  useEffect(() => {
    void loadWorkplaceNeeds();
  }, []);

  const handleWorkplaceNeedSubmit = async (payload: FormData) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await createWorkplaceNeed(payload);
      setSuccessMessage("Workplace need submitted.");
      await loadWorkplaceNeeds();
    } catch (error) {
      let message = "Unable to submit the workplace need.";
      if (isAxiosError<ApiErrorResponse>(error)) {
        const apiErrors = error.response?.data?.errors;
        const firstFieldError =
          apiErrors &&
          Object.values(apiErrors)
            .flatMap((value) => (Array.isArray(value) ? value : [value]))
            .find(Boolean);
        message =
          (typeof firstFieldError === "string" ? firstFieldError : undefined) ??
          error.response?.data?.message ??
          message;
      }
      setErrorMessage(message);
      throw new Error(message);
    }
  };

  return (
    <main className="worker-page">
      <div className="worker-page-content">
        {errorMessage ? (
          <div className="alert alert-danger worker-page__alert" role="alert">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="alert alert-success worker-page__alert" role="alert">
            {successMessage}
          </div>
        ) : null}

        <WorkplaceNeedsPanel
          mode="worker"
          showTitle={false}
          description="Track requests submitted for supervisor verification."
          needs={workplaceNeeds}
          contextProjects={workplaceNeedProjects}
          isLoading={isLoading}
          onSubmitNeed={handleWorkplaceNeedSubmit}
          onPrepareSubmit={refreshSubmitContext}
          submitLabel="+ Submit Need"
        />
      </div>
    </main>
  );
};

export default WorkerWorkplaceNeedsPage;

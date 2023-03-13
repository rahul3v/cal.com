import type { App_RoutingForms_Form } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";

import { ShellMain } from "@calcom/features/shell/Shell";
import useApp from "@calcom/lib/hooks/useApp";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type {
  AppGetServerSidePropsContext,
  AppPrisma,
  AppSsrInit,
  AppUser,
} from "@calcom/types/AppGetServerSideProps";
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DropdownMenuSeparator,
  Form,
  Meta,
  SettingsToggle,
  showToast,
  TextAreaField,
  TextField,
  Tooltip,
  VerticalDivider,
} from "@calcom/ui";
import { FiExternalLink, FiLink, FiDownload, FiCode, FiTrash } from "@calcom/ui/components/icon";

import { RoutingPages } from "../lib/RoutingPages";
import { getSerializableForm } from "../lib/getSerializableForm";
import { processRoute } from "../lib/processRoute";
import type { Response, Route, SerializableForm } from "../types/types";
import { FormAction, FormActionsDropdown, FormActionsProvider } from "./FormActions";
import FormInputFields from "./FormInputFields";
import RoutingNavBar from "./RoutingNavBar";

type RoutingForm = SerializableForm<App_RoutingForms_Form>;

export type RoutingFormWithResponseCount = RoutingForm & {
  _count: {
    responses: number;
  };
};

const Actions = ({
  form,
  mutation,
}: {
  form: RoutingFormWithResponseCount;
  mutation: {
    isLoading: boolean;
  };
}) => {
  const { t } = useLocale();
  const { data: typeformApp } = useApp("typeform");

  return (
    <div className="flex items-center">
      <FormAction className="self-center" data-testid="toggle-form" action="toggle" routingForm={form} />
      <VerticalDivider />
      <ButtonGroup combined containerProps={{ className: "hidden md:inline-flex items-center" }}>
        <Tooltip content={t("preview")}>
          <FormAction
            routingForm={form}
            color="secondary"
            target="_blank"
            variant="icon"
            type="button"
            rel="noreferrer"
            action="preview"
            StartIcon={FiExternalLink}
          />
        </Tooltip>
        <FormAction
          routingForm={form}
          action="copyLink"
          color="secondary"
          variant="icon"
          type="button"
          StartIcon={FiLink}
          tooltip={t("copy_link_to_form")}
        />

        <Tooltip content="Download Responses">
          <FormAction
            data-testid="download-responses"
            routingForm={form}
            action="download"
            color="secondary"
            variant="icon"
            type="button"
            StartIcon={FiDownload}
          />
        </Tooltip>
        <FormAction
          routingForm={form}
          action="embed"
          color="secondary"
          variant="icon"
          StartIcon={FiCode}
          tooltip={t("embed")}
        />
        <DropdownMenuSeparator />
        <FormAction
          routingForm={form}
          action="_delete"
          // className="mr-3"
          variant="icon"
          StartIcon={FiTrash}
          color="secondary"
          type="button"
          tooltip={t("delete")}
        />
        {typeformApp?.isInstalled ? (
          <FormActionsDropdown form={form}>
            <FormAction
              data-testid="copy-redirect-url"
              routingForm={form}
              action="copyRedirectUrl"
              color="minimal"
              type="button"
              StartIcon={FiLink}>
              {t("Copy Typeform Redirect Url")}
            </FormAction>
          </FormActionsDropdown>
        ) : null}
      </ButtonGroup>

      <div className="flex md:hidden">
        <FormActionsDropdown form={form}>
          <FormAction
            routingForm={form}
            color="minimal"
            target="_blank"
            type="button"
            rel="noreferrer"
            action="preview"
            StartIcon={FiExternalLink}>
            {t("preview")}
          </FormAction>
          <FormAction
            action="copyLink"
            className="w-full"
            routingForm={form}
            color="minimal"
            type="button"
            StartIcon={FiLink}>
            {t("copy_link_to_form")}
          </FormAction>
          <FormAction
            action="download"
            routingForm={form}
            className="w-full"
            color="minimal"
            type="button"
            StartIcon={FiDownload}>
            {t("download_responses")}
          </FormAction>
          <FormAction
            action="embed"
            routingForm={form}
            color="minimal"
            type="button"
            className="w-full"
            StartIcon={FiCode}>
            {t("embed")}
          </FormAction>
          {typeformApp ? (
            <FormAction
              data-testid="copy-redirect-url"
              routingForm={form}
              action="copyRedirectUrl"
              color="minimal"
              type="button"
              StartIcon={FiLink}>
              {t("Copy Typeform Redirect Url")}
            </FormAction>
          ) : null}
          <DropdownMenuSeparator />
          <FormAction
            action="_delete"
            routingForm={form}
            className="w-full"
            type="button"
            color="destructive"
            StartIcon={FiTrash}>
            {t("delete")}
          </FormAction>
        </FormActionsDropdown>
      </div>
      <VerticalDivider />
      <Button data-testid="update-form" loading={mutation.isLoading} type="submit" color="primary">
        {t("save")}
      </Button>
    </div>
  );
};

type SingleFormComponentProps = {
  form: RoutingFormWithResponseCount;
  appUrl: string;
  Page: React.FC<{
    form: RoutingFormWithResponseCount;
    appUrl: string;
    hookForm: UseFormReturn<RoutingFormWithResponseCount>;
  }>;
};

function SingleForm({ form, appUrl, Page }: SingleFormComponentProps) {
  const utils = trpc.useContext();
  const { t } = useLocale();

  const [isTestPreviewOpen, setIsTestPreviewOpen] = useState(false);
  const [response, setResponse] = useState<Response>({});
  const [decidedAction, setDecidedAction] = useState<Route["action"] | null>(null);

  function testRouting() {
    const action = processRoute({ form, response });
    setDecidedAction(action);
  }

  const hookForm = useForm({
    defaultValues: form,
  });

  useEffect(() => {
    hookForm.reset(form);
  }, [form, hookForm]);

  const mutation = trpc.viewer.appRoutingForms.formMutation.useMutation({
    onSuccess() {
      showToast("Form updated successfully.", "success");
    },
    onError(e) {
      if (e.message) {
        showToast(e.message, "error");
        return;
      }
      showToast(`Something went wrong`, "error");
    },
    onSettled() {
      utils.viewer.appRoutingForms.formQuery.invalidate({ id: form.id });
    },
  });
  const connectedForms = form.connectedForms;

  return (
    <>
      <Form
        form={hookForm}
        handleSubmit={(data) => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          mutation.mutate({
            ...data,
          });
        }}>
        <FormActionsProvider appUrl={appUrl}>
          <Meta title={form.name} description={form.description || ""} />
          <ShellMain
            heading={form.name}
            subtitle={form.description || ""}
            backPath={`/${appUrl}/forms`}
            CTA={<Actions form={form} mutation={mutation} />}>
            <div className="-mx-4 px-4 sm:px-6 md:-mx-8 md:px-8">
              <div className="flex flex-col items-center md:flex-row md:items-start">
                <div className="lg:min-w-72 lg:max-w-72 mb-6 md:mr-6">
                  <TextField
                    type="text"
                    containerClassName="mb-6"
                    placeholder={t("title")}
                    {...hookForm.register("name")}
                  />
                  <TextAreaField
                    rows={3}
                    id="description"
                    data-testid="description"
                    placeholder={t("form_description_placeholder")}
                    {...hookForm.register("description")}
                    defaultValue={form.description || ""}
                  />

                  <div className="mt-6">
                    <Controller
                      name="settings.emailOwnerOnSubmission"
                      control={hookForm.control}
                      render={({ field: { value, onChange } }) => {
                        return (
                          <SettingsToggle
                            title={t("routing_forms_send_email_owner")}
                            description={t("routing_forms_send_email_owner_description")}
                            checked={value}
                            onCheckedChange={(val) => onChange(val)}
                          />
                        );
                      }}
                    />
                  </div>

                  {form.routers.length ? (
                    <div className="mt-6">
                      <div className="text-emphasis mb-2 block text-sm font-semibold leading-none ">
                        Routers
                      </div>
                      <p className="text-default -mt-1 text-xs leading-normal">
                        {t("modifications_in_fields_warning")}
                      </p>
                      <div className="flex">
                        {form.routers.map((router) => {
                          return (
                            <div key={router.id} className="mr-2">
                              <Link href={`/${appUrl}/route-builder/${router.id}`}>
                                <Badge variant="gray">{router.name}</Badge>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {connectedForms?.length ? (
                    <div className="mt-6">
                      <div className="text-emphasis mb-2 block text-sm font-semibold leading-none ">
                        {t("connected_forms")}
                      </div>
                      <p className="text-default -mt-1 text-xs leading-normal">
                        {t("form_modifications_warning")}
                      </p>
                      <div className="flex">
                        {connectedForms.map((router) => {
                          return (
                            <div key={router.id} className="mr-2">
                              <Link href={`/${appUrl}/route-builder/${router.id}`}>
                                <Badge variant="default">{router.name}</Badge>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <Button
                      color="secondary"
                      data-testid="test-preview"
                      onClick={() => setIsTestPreviewOpen(true)}>
                      {t("test_preview")}
                    </Button>
                  </div>
                  {!form._count?.responses && (
                    <>
                      <Alert
                        className="mt-6"
                        severity="neutral"
                        title={t("no_responses_yet")}
                        message={t("responses_collection_waiting_description")}
                      />
                    </>
                  )}
                </div>
                <div className="w-full rounded-md border border-subtle p-8">
                  <RoutingNavBar appUrl={appUrl} form={form} />
                  <Page hookForm={hookForm} form={form} appUrl={appUrl} />
                </div>
              </div>
            </div>
          </ShellMain>
        </FormActionsProvider>
      </Form>
      <Dialog open={isTestPreviewOpen} onOpenChange={setIsTestPreviewOpen}>
        <DialogContent enableOverflow>
          <DialogHeader title={t("test_routing_form")} subtitle={t("test_preview_description")} />
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                testRouting();
              }}>
              <div className="px-1">
                {form && <FormInputFields form={form} response={response} setResponse={setResponse} />}
              </div>
              <div>
                {decidedAction && (
                  <div className="bg-subtle mt-5 rounded-md p-3">
                    <div className="font-bold ">{t("route_to")}:</div>
                    <div className="mt-2">
                      {RoutingPages.map((page) => {
                        if (page.value !== decidedAction.type) return null;
                        return (
                          <div key={page.value} data-testid="test-routing-result-type">
                            {page.label}
                          </div>
                        );
                      })}
                      :{" "}
                      {decidedAction.type === "customPageMessage" ? (
                        <span className="text-default" data-testid="test-routing-result">
                          {decidedAction.value}
                        </span>
                      ) : decidedAction.type === "externalRedirectUrl" ? (
                        <span className="text-default underline">
                          <a
                            target="_blank"
                            data-testid="test-routing-result"
                            href={
                              decidedAction.value.includes("https://") ||
                              decidedAction.value.includes("http://")
                                ? decidedAction.value
                                : `http://${decidedAction.value}`
                            }
                            rel="noreferrer">
                            {decidedAction.value}
                          </a>
                        </span>
                      ) : (
                        <span className="text-default underline">
                          <a
                            target="_blank"
                            href={`/${decidedAction.value}`}
                            rel="noreferrer"
                            data-testid="test-routing-result">
                            {decidedAction.value}
                          </a>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose
                  color="secondary"
                  onClick={() => {
                    setIsTestPreviewOpen(false);
                    setDecidedAction(null);
                    setResponse({});
                  }}>
                  {t("close")}
                </DialogClose>
                <Button type="submit" data-testid="test-routing">
                  {t("test_routing")}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function SingleFormWrapper({ form: _form, ...props }: SingleFormComponentProps) {
  const { data: form, isLoading } = trpc.viewer.appRoutingForms.formQuery.useQuery(
    { id: _form.id },
    {
      initialData: _form,
      trpc: {},
    }
  );
  const { t } = useLocale();

  if (isLoading) {
    // It shouldn't be possible because we are passing the data from SSR to it as initialData. So, no need for skeleton here
    return null;
  }

  if (!form) {
    throw new Error(t("something_went_wrong"));
  }
  return <SingleForm form={form} {...props} />;
}

export const getServerSidePropsForSingleFormView = async function getServerSidePropsForSingleFormView(
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma,
  user: AppUser,
  ssrInit: AppSsrInit
) {
  const ssr = await ssrInit(context);

  if (!user) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }
  const { params } = context;
  if (!params) {
    return {
      notFound: true,
    };
  }
  const formId = params.appPages[0];
  if (!formId || params.appPages.length > 1) {
    return {
      notFound: true,
    };
  }

  const isFormEditAllowed = (await import("../lib/isFormEditAllowed")).isFormEditAllowed;
  if (!(await isFormEditAllowed({ userId: user.id, formId }))) {
    return {
      notFound: true,
    };
  }

  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: formId,
    },
    include: {
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });
  if (!form) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      trpcState: ssr.dehydrate(),
      form: await getSerializableForm(form),
    },
  };
};

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { gql, request } from "graphql-request";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { base16AteliersulphurpoolLight } from "react-syntax-highlighter/dist/cjs/styles/prism";

export const loader = async ({ request: req }: LoaderFunctionArgs) => {
  await authenticate.admin(req);
  const query = gql`
    {
      products(first: 1) {
        edges {
          node {
            id
            title
            description
            variantsCount {
              count
            }
          }
        }
      }
    }
  `;

  const response = await request("https://mock.shop/api", query);
  return response;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  return null;
};

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="GraphQL Test" />
      <Layout>
        <Layout.AnnotatedSection
          title="GraphQL Test Page"
          description="This is a boilerplate page for testing GraphQL queries and mutations."
        >
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                GraphQL Response:
              </Text>

              <SyntaxHighlighter
                language="json"
                style={base16AteliersulphurpoolLight}
              >
                {JSON.stringify(data, null, 2)}
              </SyntaxHighlighter>
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>
      </Layout>
    </Page>
  );
}

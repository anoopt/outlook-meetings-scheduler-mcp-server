import Graph from '../graph.js';

/**
 * Creates a Graph client with environment variables
 * @returns Configuration object with Graph client and user email
 */
export function getGraphConfig() {
  const clientId = process.env.CLIENT_ID || "";
  const clientSecret = process.env.CLIENT_SECRET || "";
  const tenantId = process.env.TENANT_ID || "";
  const userEmail = process.env.USER_EMAIL || "";
  
  const graph = new Graph(
    clientId,
    clientSecret,
    tenantId
  );
  
  return { graph, userEmail };
}

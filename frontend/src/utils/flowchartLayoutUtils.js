import dagre from 'dagre';

// Convert SuperHumanly process data to React Flow format
// Uses Dagre algorithm for automatic, consistent layout

const NODE_WIDTH = 300;
const NODE_HEIGHT = 100;
const DECISION_SIZE = 128;

export const convertToReactFlowFormat = (process) => {
  if (!process || !process.nodes) return { nodes: [], edges: [] };

  const nodes = [];
  const edges = [];
  
  // First pass: Create nodes with proper types
  process.nodes.forEach((node, index) => {
    const isStart = node.type === 'trigger' || node.status === 'trigger' || index === 0;
    const isEnd = node.type === 'end' || index === process.nodes.length - 1;
    const isDecision = node.type === 'decision';

    let nodeType = 'action';
    if (isStart || isEnd) {
      nodeType = 'startEnd';
    } else if (isDecision) {
      nodeType = 'decision';
    }

    // Create node with data
    nodes.push({
      id: node.id,
      type: nodeType,
      position: { x: 0, y: 0 }, // Will be calculated by Dagre
      data: {
        ...node,
        title: node.title,
        description: node.description,
        actor: node.actors?.[0] || node.actor,
        operationalDetails: node.operationalDetails,
        status: node.status,
        type: node.type,
      },
      // Set dimensions for Dagre
      width: isDecision ? DECISION_SIZE : NODE_WIDTH,
      height: isDecision ? DECISION_SIZE : NODE_HEIGHT,
    });
  });

  // Second pass: Create edges
  if (process.edges && process.edges.length > 0) {
    // Use explicit edges from backend
    process.edges.forEach((edge) => {
      edges.push({
        id: edge.id || `edge-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: 'custom',
        animated: edge.condition === 'yes',
        data: {
          label: edge.label,
          condition: edge.condition,
        },
        sourceHandle: edge.condition === 'yes' ? 'yes' : edge.condition === 'no' ? 'no' : undefined,
      });
    });
  } else {
    // Fallback: Create sequential edges
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'custom',
        data: {},
      });
    }
  }

  // Apply Dagre layout
  return getLayoutedElements(nodes, edges);
};

// Use Dagre to calculate optimal layout
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure graph layout
  dagreGraph.setGraph({
    rankdir: direction, // TB = top to bottom, LR = left to right
    nodesep: 80, // Horizontal spacing between nodes
    ranksep: 150, // Vertical spacing between ranks
    edgesep: 40, // Spacing between edges
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: node.width || NODE_WIDTH, 
      height: node.height || NODE_HEIGHT 
    });
  });

  // Add edges to graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Dagre returns center coordinates, React Flow needs top-left
    // So we subtract half width/height to get top-left corner
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (node.width || NODE_WIDTH) / 2,
        y: nodeWithPosition.y - (node.height || NODE_HEIGHT) / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// Export for potential future use
export const getAutoLayout = getLayoutedElements;

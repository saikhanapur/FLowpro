// Convert SuperHumanly process data to React Flow format
// Implements intelligent layout with branching support

export const convertToReactFlowFormat = (process) => {
  if (!process || !process.nodes) return { nodes: [], edges: [] };

  const nodes = [];
  const edges = [];
  
  // TIGHTER, HARMONIOUS SPACING
  let currentY = 0;
  const verticalSpacing = 150; // Back to 150px (was 200px)
  const horizontalBranchSpacing = 350; // Reduced from 500px
  const centerX = 400;

  // Track nodes by ID for positioning
  const nodePositions = new Map();

  // First pass: Identify node types and create basic nodes
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

    // Calculate position (will be refined for branching)
    const position = {
      x: centerX,
      y: currentY
    };

    nodePositions.set(node.id, position);

    nodes.push({
      id: node.id,
      type: nodeType,
      position,
      data: {
        ...node,
        title: node.title,
        description: node.description,
        actor: node.actors?.[0] || node.actor,
        operationalDetails: node.operationalDetails,
        status: node.status,
        type: node.type,
      },
    });

    currentY += verticalSpacing;
  });

  // Second pass: Create edges
  if (process.edges && process.edges.length > 0) {
    // Use explicit edges from backend
    process.edges.forEach((edge) => {
      const edgeData = {
        id: edge.id || `edge-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: 'custom',
        animated: edge.condition === 'yes', // Animate YES paths
        data: {
          label: edge.label,
          condition: edge.condition,
        },
        // Use specific handle IDs for decision branches
        ...(edge.condition === 'yes' && { sourceHandle: 'yes' }),
        ...(edge.condition === 'no' && { sourceHandle: 'no' }),
      };

      edges.push(edgeData);
    });

    // Adjust positions for branching layout
    adjustBranchingLayout(nodes, edges, nodePositions, horizontalBranchSpacing, centerX);
  } else {
    // Fallback: Create sequential edges if no explicit edges provided
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

  return { nodes, edges };
};

// Adjust node positions for branching visualization
const adjustBranchingLayout = (nodes, edges, nodePositions, horizontalSpacing, centerX) => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const processedNodes = new Set();

  // Find decision nodes and adjust their branch positions
  nodes.forEach(node => {
    if (node.type === 'decision') {
      // Find outgoing edges
      const yesEdge = edges.find(e => e.source === node.id && e.data?.condition === 'yes');
      const noEdge = edges.find(e => e.source === node.id && e.data?.condition === 'no');

      if (yesEdge && noEdge) {
        const yesTarget = nodeMap.get(yesEdge.target);
        const noTarget = nodeMap.get(noEdge.target);

        // Position YES branch to the right with balanced spacing
        if (yesTarget && !processedNodes.has(yesTarget.id)) {
          yesTarget.position.x = centerX + horizontalSpacing;
          yesTarget.position.y = node.position.y + 200; // Balanced vertical push
          processedNodes.add(yesTarget.id);
        }

        // Position NO branch to the left with balanced spacing
        if (noTarget && !processedNodes.has(noTarget.id)) {
          noTarget.position.x = centerX - horizontalSpacing;
          noTarget.position.y = node.position.y + 200; // Balanced vertical push
          processedNodes.add(noTarget.id);
        }
      }
    }
  });

  // Find merge points (nodes with multiple incoming edges)
  const incomingEdgesCount = new Map();
  edges.forEach(edge => {
    const count = incomingEdgesCount.get(edge.target) || 0;
    incomingEdgesCount.set(edge.target, count + 1);
  });

  // Center merge points and add extra space
  incomingEdgesCount.forEach((count, nodeId) => {
    if (count > 1) {
      const node = nodeMap.get(nodeId);
      if (node) {
        node.position.x = centerX; // Center position
        // Add extra vertical space before merge point
        node.position.y += 100;
      }
    }
  });
};

// Calculate auto-layout using Dagre algorithm (future enhancement)
export const getAutoLayout = (nodes, edges) => {
  // This will be enhanced with Dagre in Phase 2
  // For now, return the manual layout
  return { nodes, edges };
};

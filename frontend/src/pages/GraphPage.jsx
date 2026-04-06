import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { runPortfolioAgent } from '../utils/agent';
import { useApiConfig } from '../hooks/useApiConfig';
import Header from '../components/app/Header';
import { classifyContradiction, TYPE_COLORS, TYPE_SHORT, TYPE_LABELS } from '../utils/classifier';
import { DEMO_CONTRACTS, DEMO_FINDINGS, DEMO_RISK_TREND, buildClauseAnalysis } from '../utils/demoPortfolioData';
import Toast from '../components/app/Toast';
import './GraphPage.css';

const parseUserContract = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  const clauses = [];
  let currentClause = null;
  let clauseNum = 1;
  for (const line of lines) {
    const isHeader = /^(clause|section|\d+\.)\s/i.test(line.trim()) ||
      (line.trim().length < 60 && line.trim() === line.trim().toUpperCase());
    if (isHeader && line.trim().length > 3) {
      if (currentClause) clauses.push(currentClause);
      currentClause = { id: `clause_${String(clauseNum).padStart(2, '0')}`, title: line.trim(), text: '' };
      clauseNum++;
    } else if (currentClause) {
      currentClause.text += (currentClause.text ? ' ' : '') + line.trim();
    }
  }
  if (currentClause) clauses.push(currentClause);
  if (clauses.length < 2) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);
    return paragraphs.map((p, i) => ({
      id: `clause_${String(i + 1).padStart(2, '0')}`, title: `Clause ${i + 1}`, text: p.trim()
    }));
  }
  return clauses;
};

const TABS = ['graph', 'dashboard', 'clauses'];
const TAB_LABELS = { graph: '⚡ Conflict Graph', dashboard: '📊 Dashboard', clauses: '🔍 Clause Analysis' };

export default function GraphPage() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('graph');
  const [expandedClause, setExpandedClause] = useState(null);
  const [clauseFilter, setClauseFilter] = useState('all');
  const [clauseSearch, setClauseSearch] = useState('');
  const [apiConfig] = useApiConfig();

  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomRef = useRef(null);
  const donutRef = useRef(null);
  const barRef = useRef(null);
  const trendRef = useRef(null);
  const heatmapRef = useRef(null);

  const toastTimer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ── File Upload ──
  const handleFileUpload = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer ? e.dataTransfer.files : e.target.files);
    if (!files.length) return;
    if (contracts.length + files.length > 5) { showToast('Maximum 5 contracts allowed', 'error'); return; }
    const newContracts = [];
    for (let file of files) {
      const text = await file.text();
      let parsedClauses = []; let isJSON = false;
      try { const json = JSON.parse(text); if (json.clauses) { parsedClauses = json.clauses; isJSON = true; } } catch (err) { }
      if (!isJSON) parsedClauses = parseUserContract(text);
      newContracts.push({
        id: `CONTRACT_${contracts.length + newContracts.length + 1}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        clauses: parsedClauses,
        contract_text: isJSON ? JSON.parse(text).contract_text || '' : text,
        instructions: "Identify contradictions between these contracts in a portfolio.",
      });
    }
    setContracts(prev => [...prev, ...newContracts]);
    showToast(`Added ${newContracts.length} contract(s)`);
  };

  const removeContract = (idx) => {
    setContracts(prev => prev.filter((_, i) => i !== idx));
    setFindings([]);
  };

  // ── Load Demo ──
  const loadDemoData = () => {
    setContracts(DEMO_CONTRACTS);
    setFindings(DEMO_FINDINGS);
    setActiveTab('dashboard');
    showToast('Demo data loaded — 3 contracts, 8 contradictions detected');
  };

  // ── Run Analysis ──
  const handleRunAnalysis = async () => {
    if (contracts.length < 2) { showToast('Need at least 2 contracts', 'error'); return; }
    if (!apiConfig.keys || !apiConfig.keys[apiConfig.provider]) {
      showToast('API key missing. Set it in the main App page settings.', 'error'); return;
    }
    setLoading(true); setError(null); setFindings([]); setSelectedEdge(null);
    try {
      const resultFindings = await runPortfolioAgent(contracts, apiConfig);
      setFindings(resultFindings);
      showToast(`Analysis complete: ${resultFindings.length} contradictions found`);
    } catch (err) { setError(err.message); showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const getSeverity = (type) => {
    if (type === 'definition' || type === 'termination_renewal') return 'high';
    if (type === 'temporal' || type === 'party_obligation') return 'medium';
    return 'low';
  };

  // ── Stats ──
  const stats = useMemo(() => {
    let high = 0, medium = 0, low = 0;
    const typeCounts = {};
    findings.forEach(f => {
      const type = f.contradiction_type || classifyContradiction(f, null);
      const sev = f.severity || getSeverity(type);
      if (sev === 'high') high++;
      else if (sev === 'medium') medium++;
      else low++;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    return { high, medium, low, total: findings.length, typeCounts };
  }, [findings]);

  // ── Clause Analysis ──
  const clauseAnalysis = useMemo(() => {
    if (!contracts.length) return [];
    return buildClauseAnalysis(contracts, findings);
  }, [contracts, findings]);

  const filteredClauses = useMemo(() => {
    let result = clauseAnalysis;
    if (clauseFilter !== 'all') result = result.filter(c => c.riskLevel === clauseFilter);
    if (clauseSearch.trim()) {
      const q = clauseSearch.toLowerCase();
      result = result.filter(c => c.title.toLowerCase().includes(q) || c.contractName.toLowerCase().includes(q));
    }
    return result;
  }, [clauseAnalysis, clauseFilter, clauseSearch]);

  // ═══════════════════════════════════════
  // D3 CONFLICT GRAPH
  // ═══════════════════════════════════════
  useEffect(() => {
    if (activeTab !== 'graph' || contracts.length === 0 || !svgRef.current) return;
    const width = svgRef.current.parentElement.clientWidth;
    const height = svgRef.current.parentElement.clientHeight;
    const svg = d3.select(svgRef.current); svg.selectAll('*').remove();
    const container = svg.append('g');
    const zoom = d3.zoom().scaleExtent([0.1, 4]).on('zoom', (event) => container.attr('transform', event.transform));
    svg.call(zoom); zoomRef.current = zoom;
    const colors = ['#7F77DD', '#1D9E75', '#378ADD', '#EF9F27', '#E24B4A'];
    const nodes = [], links = [], allClausesMap = {};
    contracts.forEach((contract, idx) => {
      const color = colors[idx % colors.length];
      nodes.push({ id: contract.id, isContract: true, name: contract.name, color, radius: 40 });
      contract.clauses.forEach(clause => {
        const fullId = `${contract.id}::${clause.id}`;
        allClausesMap[fullId] = { ...clause, contractId: contract.id, contractName: contract.name };
        nodes.push({ id: fullId, isContract: false, color, radius: 8, clause, contractName: contract.name });
        links.push({ source: fullId, target: contract.id, type: 'intra', id: `intra_${fullId}_to_${contract.id}` });
      });
    });
    findings.forEach((finding, idx) => {
      const sourceExists = allClausesMap[finding.clause_a_id];
      const targetExists = allClausesMap[finding.clause_b_id];
      if (sourceExists && targetExists) {
        const type = finding.contradiction_type || classifyContradiction(finding, null);
        links.push({
          source: finding.clause_a_id, target: finding.clause_b_id, type: 'inter',
          data: { ...finding, type, severity: finding.severity || getSeverity(type) }, id: `inter_${idx}`
        });
      }
    });
    const tooltip = d3.select('body').append('div').attr('class', 'graph-tooltip').style('opacity', 0);
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.type === 'inter' ? 150 : 50))
      .force('charge', d3.forceManyBody().strength(d => d.isContract ? -800 : -30))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => d.radius + 5));
    simulationRef.current = simulation;
    const link = container.append('g').selectAll('line').data(links).enter().append('line')
      .attr('class', d => d.type === 'inter' ? 'inter-link' : 'intra-link')
      .attr('stroke', d => d.type === 'inter' ? 'var(--red)' : '#666')
      .attr('stroke-width', d => d.type === 'inter' ? 2.5 : 1)
      .attr('stroke-opacity', d => d.type === 'inter' ? 1 : 0.2)
      .attr('stroke-dasharray', d => d.type === 'inter' ? '8,4' : 'none')
      .style('cursor', d => d.type === 'inter' ? 'pointer' : 'default')
      .on('mouseover', function (event, d) {
        if (d.type !== 'inter') return;
        d3.select(this).attr('stroke-width', 4).attr('stroke', '#ff0000');
        tooltip.transition().duration(200).style('opacity', .9);
        tooltip.html(`<b>${TYPE_SHORT[d.data.type] || 'Contradiction'}</b><br/>${d.data.explanation.substring(0, 60)}...`)
          .style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function (event, d) {
        if (d.type !== 'inter') return;
        d3.select(this).attr('stroke-width', 2.5).attr('stroke', 'var(--red)');
        tooltip.transition().duration(500).style('opacity', 0);
      })
      .on('click', (event, d) => {
        if (d.type === 'inter') setSelectedEdge({
          finding: d.data, sourceClause: allClausesMap[d.data.clause_a_id], targetClause: allClausesMap[d.data.clause_b_id]
        });
      });
    link.filter(d => d.type === 'inter').style('opacity', 0).transition().duration(800).delay((d, i) => i * 300).style('opacity', 1);
    const node = container.append('g').selectAll('circle').data(nodes).enter().append('g')
      .call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended));
    node.append('circle').attr('r', d => d.radius).attr('fill', d => d.color)
      .attr('fill-opacity', d => d.isContract ? 0.8 : 0.4)
      .attr('stroke', d => d.isContract ? '#fff' : 'none').attr('stroke-width', d => d.isContract ? 2 : 0)
      .on('mouseover', function (event, d) {
        tooltip.transition().duration(200).style('opacity', .9);
        tooltip.html(d.isContract ? `<b>${d.name}</b>` : `<b>${d.clause.title}</b><br/>${d.clause.text.substring(0, 60)}...`)
          .style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', () => tooltip.transition().duration(500).style('opacity', 0));
    node.filter(d => d.isContract).append('text').attr('text-anchor', 'middle').attr('dy', '.3em')
      .style('fill', '#fff').style('font-size', '12px').style('font-weight', 'bold').style('pointer-events', 'none')
      .text(d => d.name.length > 10 ? d.name.substring(0, 8) + '..' : d.name);
    simulation.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    function dragstarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
    function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
    function dragended(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }
    return () => { simulation.stop(); d3.select('.graph-tooltip').remove(); };
  }, [contracts, findings, activeTab]);

  // ═══════════════════════════════════════
  // D3 DONUT CHART
  // ═══════════════════════════════════════
  useEffect(() => {
    if (activeTab !== 'dashboard' || !donutRef.current || findings.length === 0) return;
    const el = donutRef.current;
    const w = el.clientWidth, h = el.clientHeight;
    const size = Math.min(w, h) - 20;
    const radius = size / 2;
    d3.select(el).select('svg').remove();
    const svg = d3.select(el).append('svg').attr('width', w).attr('height', h)
      .append('g').attr('transform', `translate(${w / 2},${h / 2})`);
    const data = [
      { label: 'High', value: stats.high, color: '#FF5C5C' },
      { label: 'Medium', value: stats.medium, color: '#FFB83D' },
      { label: 'Low', value: stats.low, color: '#4DA6FF' },
    ].filter(d => d.value > 0);
    const pie = d3.pie().value(d => d.value).sort(null).padAngle(0.03);
    const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius * 0.85);
    const arcHover = d3.arc().innerRadius(radius * 0.52).outerRadius(radius * 0.9);
    const paths = svg.selectAll('path').data(pie(data)).enter().append('path')
      .attr('fill', d => d.data.color).style('opacity', 0).style('cursor', 'pointer')
      .on('mouseover', function () { d3.select(this).transition().duration(200).attr('d', arcHover).style('filter', 'brightness(1.2)'); })
      .on('mouseout', function () { d3.select(this).transition().duration(200).attr('d', arc).style('filter', 'none'); });
    paths.transition().duration(800).delay((d, i) => i * 200).attrTween('d', function (d) {
      const interp = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
      return t => arc(interp(t));
    }).style('opacity', 1);
    // center text
    svg.append('text').attr('text-anchor', 'middle').attr('dy', '-0.2em')
      .style('font-size', '28px').style('font-weight', '700').style('fill', '#1a1a2e').text(stats.total);
    svg.append('text').attr('text-anchor', 'middle').attr('dy', '1.4em')
      .style('font-size', '12px').style('fill', 'var(--text-secondary)').style('font-weight', '600').text('conflicts');
    // legend
    const legend = svg.selectAll('.legend').data(data).enter().append('g')
      .attr('transform', (d, i) => `translate(${radius + 20},${-data.length * 10 + i * 24})`);
    legend.append('rect').attr('width', 12).attr('height', 12).attr('rx', 3).attr('fill', d => d.color);
    legend.append('text').attr('x', 18).attr('y', 10).style('font-size', '12px').style('fill', 'var(--text-secondary)').style('font-weight', '600')
      .text(d => `${d.label} (${d.value})`);
  }, [activeTab, findings, stats]);

  // ═══════════════════════════════════════
  // D3 BAR CHART — Contradiction Types
  // ═══════════════════════════════════════
  useEffect(() => {
    if (activeTab !== 'dashboard' || !barRef.current || findings.length === 0) return;
    const el = barRef.current;
    const margin = { top: 20, right: 20, bottom: 20, left: 110 };
    const w = el.clientWidth - margin.left - margin.right;
    const h = el.clientHeight - margin.top - margin.bottom;
    d3.select(el).select('svg').remove();
    const svg = d3.select(el).append('svg').attr('width', el.clientWidth).attr('height', el.clientHeight)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const data = Object.entries(stats.typeCounts).map(([type, count]) => ({
      type, label: TYPE_SHORT[type] || type, count, color: TYPE_COLORS[type] || '#9898b8'
    })).sort((a, b) => b.count - a.count);
    const y = d3.scaleBand().domain(data.map(d => d.label)).range([0, h]).padding(0.35);
    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.count) * 1.2]).range([0, w]);
    svg.append('g').call(d3.axisLeft(y).tickSize(0)).select('.domain').remove();
    svg.selectAll('text').style('fill', 'var(--text-secondary)').style('font-weight', '600').style('font-size', '11px');
    // grid lines
    svg.append('g').selectAll('line').data(x.ticks(4)).enter().append('line')
      .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', 0).attr('y2', h)
      .attr('stroke', 'var(--border)');
    const bars = svg.selectAll('.bar').data(data).enter().append('rect')
      .attr('y', d => y(d.label)).attr('height', y.bandwidth()).attr('rx', 4)
      .attr('fill', d => d.color).style('opacity', 0.85).attr('x', 0).attr('width', 0)
      .style('cursor', 'pointer')
      .on('mouseover', function () { d3.select(this).style('opacity', 1).style('filter', 'brightness(1.15)'); })
      .on('mouseout', function () { d3.select(this).style('opacity', 0.85).style('filter', 'none'); });
    bars.transition().duration(800).delay((d, i) => i * 150).attr('width', d => x(d.count));
    // value labels
    svg.selectAll('.val').data(data).enter().append('text')
      .attr('x', d => x(d.count) + 6).attr('y', d => y(d.label) + y.bandwidth() / 2 + 4)
      .style('font-size', '12px').style('font-weight', '700').style('fill', '#1a1a2e').style('opacity', 0)
      .text(d => d.count)
      .transition().duration(800).delay((d, i) => i * 150 + 400).style('opacity', 1);
  }, [activeTab, findings, stats]);

  // ═══════════════════════════════════════
  // D3 TREND LINE CHART
  // ═══════════════════════════════════════
  useEffect(() => {
    if (activeTab !== 'dashboard' || !trendRef.current || findings.length === 0) return;
    const el = trendRef.current;
    const margin = { top: 20, right: 30, bottom: 40, left: 45 };
    const w = el.clientWidth - margin.left - margin.right;
    const h = el.clientHeight - margin.top - margin.bottom;
    d3.select(el).select('svg').remove();
    const svg = d3.select(el).append('svg').attr('width', el.clientWidth).attr('height', el.clientHeight)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const data = DEMO_RISK_TREND;
    const x = d3.scalePoint().domain(data.map(d => d.month)).range([0, w]);
    const y = d3.scaleLinear().domain([0, 100]).range([h, 0]);
    // grid
    svg.append('g').selectAll('line').data(y.ticks(5)).enter().append('line')
      .attr('x1', 0).attr('x2', w).attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', 'var(--border)');
    svg.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickSize(0))
      .select('.domain').remove();
    svg.selectAll('text').style('fill', 'var(--text-secondary)').style('font-weight', '600').style('font-size', '9px')
      .attr('transform', 'rotate(-45)').attr('text-anchor', 'end');
    svg.append('g').call(d3.axisLeft(y).ticks(5).tickSize(0)).select('.domain').remove();
    svg.selectAll('.tick text').style('fill', 'var(--text-secondary)').style('font-weight', '600').style('font-size', '10px');
    // gradient area
    const areaGen = d3.area().x(d => x(d.month)).y0(h).y1(d => y(d.score)).curve(d3.curveMonotoneX);
    const gradient = svg.append('defs').append('linearGradient').attr('id', 'trendGrad').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1);
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#8B7FFF').attr('stop-opacity', 0.3);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#8B7FFF').attr('stop-opacity', 0.02);
    svg.append('path').datum(data).attr('fill', 'url(#trendGrad)').attr('d', areaGen);
    // line
    const lineGen = d3.line().x(d => x(d.month)).y(d => y(d.score)).curve(d3.curveMonotoneX);
    const path = svg.append('path').datum(data).attr('fill', 'none').attr('stroke', '#8B7FFF')
      .attr('stroke-width', 2.5).attr('d', lineGen);
    const pathLength = path.node().getTotalLength();
    path.attr('stroke-dasharray', pathLength).attr('stroke-dashoffset', pathLength)
      .transition().duration(1500).ease(d3.easeCubicOut).attr('stroke-dashoffset', 0);
    // dots
    const tooltip = d3.select('body').append('div').attr('class', 'graph-tooltip').style('opacity', 0);
    svg.selectAll('.dot').data(data).enter().append('circle')
      .attr('cx', d => x(d.month)).attr('cy', d => y(d.score)).attr('r', 4)
      .attr('fill', '#8B7FFF').attr('stroke', '#06060b').attr('stroke-width', 2)
      .style('cursor', 'pointer').style('opacity', 0)
      .on('mouseover', function (event, d) {
        d3.select(this).transition().duration(150).attr('r', 7);
        tooltip.transition().duration(200).style('opacity', 0.9);
        tooltip.html(`<b>${d.month}</b><br/>Risk: ${d.score}/100<br/>Contracts: ${d.contracts}<br/>Conflicts: ${d.contradictions}`)
          .style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 40) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this).transition().duration(150).attr('r', 4);
        tooltip.transition().duration(300).style('opacity', 0);
      })
      .transition().duration(300).delay((d, i) => 1200 + i * 80).style('opacity', 1);
    return () => { tooltip.remove(); };
  }, [activeTab, findings]);

  // ═══════════════════════════════════════
  // D3 HEATMAP — Clause Cross-Contract Conflicts
  // ═══════════════════════════════════════
  useEffect(() => {
    if (activeTab !== 'dashboard' || !heatmapRef.current || findings.length === 0 || contracts.length === 0) return;
    const el = heatmapRef.current;
    const margin = { top: 60, right: 20, bottom: 20, left: 80 };
    const w = el.clientWidth - margin.left - margin.right;
    const h = el.clientHeight - margin.top - margin.bottom;
    d3.select(el).select('svg').remove();
    // Build type matrix
    const types = Object.keys(TYPE_LABELS).filter(t => t !== 'unknown');
    const contractNames = contracts.map(c => c.name.length > 12 ? c.name.substring(0, 10) + '..' : c.name);
    // Build grid: contracts × types
    const grid = [];
    contracts.forEach((contract, ci) => {
      types.forEach((type, ti) => {
        const count = findings.filter(f => {
          const involvedA = f.clause_a_id?.startsWith(contract.id);
          const involvedB = f.clause_b_id?.startsWith(contract.id);
          const fType = f.contradiction_type || classifyContradiction(f, null);
          return (involvedA || involvedB) && fType === type;
        }).length;
        grid.push({ ci, ti, contract: contractNames[ci], type: TYPE_SHORT[type], count });
      });
    });
    const maxCount = d3.max(grid, d => d.count) || 1;
    const cellW = Math.min(w / types.length, 70);
    const cellH = Math.min(h / contracts.length, 50);
    const svg = d3.select(el).append('svg').attr('width', el.clientWidth).attr('height', el.clientHeight)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    // type labels (top)
    svg.selectAll('.type-label').data(types).enter().append('text')
      .attr('x', (d, i) => i * cellW + cellW / 2).attr('y', -12).attr('text-anchor', 'middle')
      .style('font-size', '10px').style('font-weight', '600').style('fill', 'var(--text-secondary)').text((d) => TYPE_SHORT[d]);
    // contract labels (left)
    svg.selectAll('.contract-label').data(contractNames).enter().append('text')
      .attr('x', -8).attr('y', (d, i) => i * cellH + cellH / 2 + 4).attr('text-anchor', 'end')
      .style('font-size', '10px').style('font-weight', '600').style('fill', 'var(--text-secondary)').text(d => d);
    // cells
    const colorScale = d3.scaleSequential(d3.interpolateRgb('rgba(139,127,255,0.05)', '#8B7FFF')).domain([0, maxCount]);
    const tooltip = d3.select('body').append('div').attr('class', 'graph-tooltip').style('opacity', 0);
    svg.selectAll('.cell').data(grid).enter().append('rect')
      .attr('x', d => d.ti * cellW + 2).attr('y', d => d.ci * cellH + 2)
      .attr('width', cellW - 4).attr('height', cellH - 4).attr('rx', 4)
      .attr('fill', d => d.count === 0 ? 'rgba(108,99,255,0.03)' : colorScale(d.count))
      .attr('stroke', 'var(--border)').style('cursor', 'pointer').style('opacity', 0)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('stroke', '#8B7FFF').attr('stroke-width', 2);
        if (d.count > 0) {
          tooltip.transition().duration(200).style('opacity', 0.9);
          tooltip.html(`<b>${d.contract}</b><br/>${d.type}: ${d.count} conflict(s)`)
            .style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 30) + 'px');
        }
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke', 'var(--border)').attr('stroke-width', 1);
        tooltip.transition().duration(300).style('opacity', 0);
      })
      .transition().duration(400).delay((d, i) => i * 30).style('opacity', 1);
    // count overlay
    svg.selectAll('.count').data(grid.filter(d => d.count > 0)).enter().append('text')
      .attr('x', d => d.ti * cellW + cellW / 2).attr('y', d => d.ci * cellH + cellH / 2 + 4)
      .attr('text-anchor', 'middle').style('font-size', '13px').style('font-weight', '700')
      .style('fill', '#fff').style('pointer-events', 'none').text(d => d.count);
    return () => { tooltip.remove(); };
  }, [activeTab, findings, contracts]);

  // ── Zoom ──
  const handleZoomIn = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.3); };
  const handleZoomOut = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.7); };
  const handleResetZoom = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().call(zoomRef.current.transform, d3.zoomIdentity); };

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <div className="graph-page">
      <Header 
        serverStatus="connected" 
        onSettingsClick={() => window.location.href = '/app'}
        apiConfig={apiConfig}
      />
      {/* ── HEADER ── */}
      <div className="app-header graph-header">
        <button className="back-link" onClick={() => navigate('/app')}>← Back to Tasks</button>
        <div className="app-header-center">
          <span className="app-logo">⚖ Portfolio Analysis</span>
        </div>
        <div className="graph-controls">
          <div className="graph-upload"
            onDragOver={e => e.preventDefault()} onDrop={handleFileUpload}>
            Drag & Drop Contracts (JSON/TXT)
            <input type="file" id="g_upload" multiple style={{ display: 'none' }} onChange={handleFileUpload} accept=".txt,.json" />
            <label htmlFor="g_upload" className="g-browse">Browse</label>
          </div>
          <button className="btn-demo" onClick={loadDemoData}>⚡ Demo Data</button>
          <button className="btn-run-portfolio" onClick={handleRunAnalysis} disabled={loading || contracts.length < 2}>
            {loading ? 'Analyzing...' : 'Run Portfolio Analysis'}
          </button>
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {contracts.length === 0 ? (
        <div className="graph-body">
          <div className="empty-state-full">
            <div className="empty-drop-zone" onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
              onDragLeave={e => e.currentTarget.classList.remove('drag-over')} onDrop={e => { e.currentTarget.classList.remove('drag-over'); handleFileUpload(e); }}>
              <div className="drop-icon">📂</div>
              <h2>Portfolio Analysis</h2>
              <p>Drop 2 or more contracts to begin cross-contract contradiction analysis</p>
              <div className="drop-actions">
                <label htmlFor="g_upload_main" className="btn-upload-main">
                  📎 Browse Files
                  <input type="file" id="g_upload_main" multiple style={{ display: 'none' }} onChange={handleFileUpload} accept=".txt,.json" />
                </label>
                <span className="or-divider">or</span>
                <button className="btn-demo-large" onClick={loadDemoData}>⚡ Load Demo Data</button>
              </div>
              <p className="drop-hint">Supports .json and .txt contract files</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── TAB BAR ── */}
          <div className="tab-bar">
            {TABS.map(tab => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}>
                {TAB_LABELS[tab]}
              </button>
            ))}
            <div className="tab-contracts-chips">
              {contracts.map((c, i) => (
                <span key={i} className="contract-chip">
                  <span className="chip-dot" style={{ background: ['#7F77DD', '#1D9E75', '#378ADD', '#EF9F27', '#E24B4A'][i % 5] }}></span>
                  {c.name} ({c.clauses.length})
                  <button className="chip-remove" onClick={() => removeContract(i)}>×</button>
                </span>
              ))}
            </div>
          </div>

          {/* ── STAT BAR ── */}
          {findings.length > 0 && (
            <div className="stats-bar">
              <div className="stat-item">
                <span className="stat-value">{contracts.length}</span>
                <span className="stat-label">Contracts</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{contracts.reduce((a, c) => a + c.clauses.length, 0)}</span>
                <span className="stat-label">Total Clauses</span>
              </div>
              <div className="stat-item">
                <span className="stat-value accent">{stats.total}</span>
                <span className="stat-label">Conflicts Found</span>
              </div>
              <div className="stat-item">
                <span className="stat-value high">{stats.high}</span>
                <span className="stat-label">High Risk</span>
              </div>
              <div className="stat-item">
                <span className="stat-value medium">{stats.medium}</span>
                <span className="stat-label">Medium Risk</span>
              </div>
              <div className="stat-item">
                <span className="stat-value low">{stats.low}</span>
                <span className="stat-label">Low Risk</span>
              </div>
            </div>
          )}

          {/* ── GRAPH VIEW ── */}
          <div className="graph-body" style={{ display: activeTab === 'graph' ? 'block' : 'none' }}>
            <div className="graph-container">
              <svg ref={svgRef} className="main-graph-svg" style={{ width: '100%', height: '100%' }}></svg>
              <div className="zoom-controls">
                <button onClick={handleZoomIn}>+</button>
                <button onClick={handleZoomOut}>-</button>
                <button onClick={handleResetZoom}>↺</button>
              </div>
              <div className="graph-sidebar">
                <h3>Loaded Contracts ({contracts.length})</h3>
                {contracts.map((c, i) => (
                  <div key={i} className="contract-preview-item">
                    <div className="c-dot" style={{ background: ['#7F77DD', '#1D9E75', '#378ADD', '#EF9F27', '#E24B4A'][i % 5] }}></div>
                    <span>{c.name} ({c.clauses.length} clauses)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── DASHBOARD VIEW ── */}
          <div className="graph-body" style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
            {findings.length === 0 ? (
              <div className="empty-graph">
                <div className="empty-icon">📊</div>
                <h2>No Analysis Data Yet</h2>
                <p>Run Portfolio Analysis or load demo data to see charts.</p>
              </div>
            ) : (
              <div className="dashboard-grid">
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Risk Distribution</h3>
                    <span className="chart-badge">Severity Breakdown</span>
                  </div>
                  <div className="chart-area" ref={donutRef}></div>
                </div>
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Contradiction Types</h3>
                    <span className="chart-badge">By Category</span>
                  </div>
                  <div className="chart-area" ref={barRef}></div>
                </div>
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Portfolio Risk Trend</h3>
                    <span className="chart-badge">12 Month History</span>
                  </div>
                  <div className="chart-area" ref={trendRef}></div>
                </div>
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Conflict Heatmap</h3>
                    <span className="chart-badge">Contract × Type</span>
                  </div>
                  <div className="chart-area" ref={heatmapRef}></div>
                </div>
              </div>
            )}
          </div>

          {/* ── CLAUSE ANALYSIS VIEW ── */}
          <div className="graph-body" style={{ display: activeTab === 'clauses' ? 'block' : 'none' }}>
            <div className="clause-analysis-container">
              <div className="clause-toolbar">
                <div className="clause-search-wrap">
                  <span className="search-icon">🔍</span>
                  <input type="text" className="clause-search" placeholder="Search clauses..."
                    value={clauseSearch} onChange={e => setClauseSearch(e.target.value)} />
                </div>
                <div className="clause-filters">
                  {['all', 'high', 'medium', 'safe'].map(f => (
                    <button key={f} className={`filter-btn ${clauseFilter === f ? 'active' : ''} ${f}`}
                      onClick={() => setClauseFilter(f)}>
                      {f === 'all' ? 'All Clauses' : f === 'safe' ? '✓ Safe' : f === 'high' ? '🔴 High Risk' : '🟡 Medium Risk'}
                    </button>
                  ))}
                </div>
              </div>

              {filteredClauses.length === 0 ? (
                <div className="empty-graph" style={{ marginTop: '8vh' }}>
                  <h2>No Matching Clauses</h2>
                  <p>Try adjusting filters or run analysis first.</p>
                </div>
              ) : (
                <div className="clause-list">
                  {filteredClauses.map((clause, idx) => (
                    <div key={clause.fullId} className={`clause-card ${clause.riskLevel} ${expandedClause === clause.fullId ? 'expanded' : ''}`}
                      style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="clause-card-header" onClick={() => setExpandedClause(expandedClause === clause.fullId ? null : clause.fullId)}>
                        <div className="clause-meta">
                          <span className={`risk-dot ${clause.riskLevel}`}></span>
                          <span className="clause-contract-tag">{clause.contractName}</span>
                          <h4>{clause.title}</h4>
                        </div>
                        <div className="clause-badges">
                          {clause.contradictions.length > 0 && (
                            <span className="conflict-count">{clause.contradictions.length} conflict{clause.contradictions.length > 1 ? 's' : ''}</span>
                          )}
                          <span className={`risk-badge ${clause.riskLevel}`}>
                            {clause.riskLevel === 'high' ? '🔴 High' : clause.riskLevel === 'medium' ? '🟡 Medium' : '✓ Safe'}
                          </span>
                          <span className="expand-icon">{expandedClause === clause.fullId ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {expandedClause === clause.fullId && (
                        <div className="clause-card-body">
                          <p className="clause-text-preview">{clause.text}</p>
                          {clause.contradictions.length > 0 && (
                            <div className="clause-contradictions">
                              <h5>Conflicts with:</h5>
                              {clause.contradictions.map((c, ci) => (
                                <div key={ci} className="contradiction-detail">
                                  <div className="contradiction-header-row">
                                    <span className={`type-tag ${c.type}`} style={{ background: (TYPE_COLORS[c.type] || '#9898b8') + '20', color: TYPE_COLORS[c.type] || '#9898b8' }}>
                                      {TYPE_SHORT[c.type] || c.type}
                                    </span>
                                    <span className={`sev-badge ${c.severity}`}>{c.severity.toUpperCase()}</span>
                                    <span className="conflict-target">{c.withContract} → {c.withTitle}</span>
                                  </div>
                                  <p className="contradiction-explanation">{c.explanation}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── BOTTOM DRAWER (Conflict Graph click) ── */}
      <div className={`bottom-drawer ${selectedEdge ? 'open' : ''}`}>
        {selectedEdge && (
          <div className="drawer-content">
            <button className="close-drawer" onClick={() => setSelectedEdge(null)}>✕</button>
            <div className="drawer-header">
              <div className="type-badge" style={{ background: TYPE_COLORS[selectedEdge.finding.type] + '20', color: TYPE_COLORS[selectedEdge.finding.type] }}>
                {TYPE_LABELS[selectedEdge.finding.type] || 'Unknown Type'}
              </div>
              <span className={`sev-badge ${selectedEdge.finding.severity}`}>Severity: {selectedEdge.finding.severity?.toUpperCase()}</span>
            </div>
            <p className="edge-explanation">{selectedEdge.finding.explanation}</p>
            <div className="drawer-clauses">
              <div className="drawer-col">
                <span className="contract-tag">{selectedEdge.sourceClause?.contractName}</span>
                <h4>{selectedEdge.sourceClause?.title}</h4>
                <p>{selectedEdge.sourceClause?.text}</p>
              </div>
              <div className="vs-divider">VS</div>
              <div className="drawer-col">
                <span className="contract-tag">{selectedEdge.targetClause?.contractName}</span>
                <h4>{selectedEdge.targetClause?.title}</h4>
                <p>{selectedEdge.targetClause?.text}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  );
}

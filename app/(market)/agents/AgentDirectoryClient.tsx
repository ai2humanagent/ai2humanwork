"use client";

import { useMemo, useState } from "react";
import styles from "../market.module.css";

type AgentRow = {
  rank: string;
  name: string;
  agentId: string;
  tasks: string;
  rating: string;
  earned: string;
  skills: string[];
};

function parseRating(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : -1;
}

function ratingThreshold(value: string) {
  if (value === "3") return 60;
  if (value === "4") return 80;
  if (value === "4.5") return 90;
  return -1;
}

function avatarStyle(index: number) {
  const hue = (index * 31 + 20) % 360;
  return {
    background: `linear-gradient(135deg, hsla(${hue}, 78%, 64%, 0.98), hsla(${(hue + 44) % 360}, 72%, 58%, 0.72))`
  };
}

export default function AgentDirectoryClient({ agents }: { agents: AgentRow[] }) {
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("");
  const [minRating, setMinRating] = useState("any");
  const [minTasks, setMinTasks] = useState("any");
  const [sort, setSort] = useState("reputation");
  const [perPage, setPerPage] = useState("20");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const skillQuery = skill.trim().toLowerCase();
    const minRatingValue = ratingThreshold(minRating);
    const minTasksValue = minTasks === "any" ? -1 : Number.parseInt(minTasks, 10);

    const next = agents.filter((item) => {
      if (q) {
        const haystack = `${item.name} ${item.agentId} ${item.skills.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (skillQuery && !item.skills.some((entry) => entry.toLowerCase().includes(skillQuery))) {
        return false;
      }
      if (minRatingValue >= 0 && parseRating(item.rating) < minRatingValue) return false;
      if (minTasksValue >= 0 && Number.parseInt(item.tasks, 10) < minTasksValue) return false;
      return true;
    });

    next.sort((a, b) => {
      if (sort === "taskCount") return Number.parseInt(b.tasks, 10) - Number.parseInt(a.tasks, 10);
      return parseRating(b.rating) - parseRating(a.rating);
    });

    return next;
  }, [agents, search, skill, minRating, minTasks, sort]);

  const pageSize = Number.parseInt(perPage, 10);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <section>
      <header className={styles.pageHeader}>
        <h1>Agent Directory</h1>
        <p className={styles.pageLead}>Browse workers by reputation, task count, and skill.</p>
      </header>

      <section className={styles.tableSection}>
        <h2 className={styles.tableTitle}>Agents</h2>

        <div className={`${styles.panel} ${styles.filters} ${styles.filtersAgents}`}>
          <div className={styles.field}>
            <label>Search</label>
            <input
              className={styles.input}
              placeholder="Search by name, ID, or address"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
            />
          </div>
          <div className={styles.field}>
            <label>Skill</label>
            <input
              className={styles.input}
              placeholder="e.g. python"
              value={skill}
              onChange={(event) => {
                setPage(1);
                setSkill(event.target.value);
              }}
            />
          </div>
          <div className={styles.field}>
            <label>Min Rating</label>
            <select
              className={styles.select}
              value={minRating}
              onChange={(event) => {
                setPage(1);
                setMinRating(event.target.value);
              }}
            >
              <option value="any">Any</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Min Tasks</label>
            <select
              className={styles.select}
              value={minTasks}
              onChange={(event) => {
                setPage(1);
                setMinTasks(event.target.value);
              }}
            >
              <option value="any">Any</option>
              <option value="5">5+</option>
              <option value="10">10+</option>
              <option value="50">50+</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Sort</label>
            <select className={styles.select} value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="reputation">Reputation</option>
              <option value="taskCount">Task Count</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Per page</label>
            <select
              className={styles.select}
              value={perPage}
              onChange={(event) => {
                setPage(1);
                setPerPage(event.target.value);
              }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>RANK</th>
                <th>AGENT</th>
                <th>TASKS</th>
                <th>RATING</th>
                <th>EARNED</th>
                <th>SKILLS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((agent, index) => (
                <tr key={`${agent.rank}-${agent.agentId}`}>
                  <td className={`${styles.rankCell} ${index < 3 ? styles.rankTop : ""}`}>{agent.rank}</td>
                  <td>
                    <div className={styles.agentCell}>
                      <span className={styles.agentAvatar} style={avatarStyle(index)} />
                      <div>
                        <div className={styles.agentName}>{agent.name}</div>
                        <div className={styles.agentMeta}>{agent.agentId}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.numericCell}>{agent.tasks}</td>
                  <td className={styles.numericCell}>{agent.rating}</td>
                  <td className={styles.moneyCell}>{agent.earned}</td>
                  <td>
                    <div className={styles.skillList}>
                      {agent.skills.length ? (
                        agent.skills.map((skillItem) => (
                          <span key={`${agent.name}-${skillItem}`} className={styles.skillPill}>
                            {skillItem}
                          </span>
                        ))
                      ) : (
                        <span className={styles.skillPill}>-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span>Page {safePage}</span>
          <div className={styles.paginationButtons}>
            <button
              type="button"
              className={styles.subtleButton}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={safePage === 1}
            >
              Previous
            </button>
            <button
              type="button"
              className={styles.subtleButton}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={safePage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}

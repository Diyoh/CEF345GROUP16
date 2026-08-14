import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../useAppStore';
import { StatusBadge } from '../components/StatusBadge';
import { PhotoGallery } from '../components/PhotoGallery';
import { Button, Card, Meter, Input, Select, Textarea, Badge, EmptyState } from '../components/ui';
import { formatMoney, formatDate, formatRelative, fileToBase64 } from '../utils/helpers';
import { projectHealth } from '../utils/projectHealth';

/**
 * Project detail. Spec: docs/design/02-ia-ux.md section 4.3.
 *
 * The critical restructure: completion used to sit in the main column while budget burn
 * sat in the sidebar, so the single most important comparison in the product required
 * holding one number in memory while scrolling to find the other. The Build vs Spend
 * panel is now full width, directly under the title, with both figures and one plain
 * sentence stating what they mean together.
 *
 * All existing behaviour is preserved: comment fetch on mount, addComment, base64 photo
 * upload capped at 4, and the expandable evidence thumbnails.
 */
export const ProjectDetails = () => {
  const { id } = useParams();
  const { projects, comments, addComment, fetchProjectComments } = useAppStore();
  const project = projects.find((p) => p.id === id);

  useEffect(() => {
    if (id) fetchProjectComments(id);
  }, [id]);

  const [commentText, setCommentText] = useState('');
  const [authorType, setAuthorType] = useState('Citizen');
  const [commentImages, setCommentImages] = useState([]);
  const [expandedCommentId, setExpandedCommentId] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const health = useMemo(() => (project ? projectHealth(project) : null), [project]);

  if (!project) {
    return (
      <div className="mx-auto max-w-content px-4 py-16 md:px-8">
        <EmptyState
          icon="fa-circle-question"
          title="Project not found"
          body="If it was just created it may take a moment to appear."
          action={
            <Button as={Link} to="/projects" variant="primary">
              Back to projects
            </Button>
          }
        />
      </div>
    );
  }

  const projectComments = comments.filter((c) => c.projectId === project.id);
  const galleryImages = Array.isArray(project.images) ? project.images : [];
  const updates = Array.isArray(project.updates) ? project.updates : [];

  const handleImageUpload = async (e) => {
    if (!e.target.files) return;
    setUploadError('');
    if (e.target.files.length + commentImages.length > 4) {
      setUploadError('You can attach up to 4 photos per report.');
      return;
    }
    const next = [];
    for (let i = 0; i < e.target.files.length; i += 1) {
      next.push(await fileToBase64(e.target.files[i]));
    }
    setCommentImages((prev) => [...prev, ...next]);
  };

  const submitComment = (e) => {
    e.preventDefault();
    if (!commentText) return;
    // No name is collected or sent. Reports are anonymous by design.
    addComment({
      projectId: project.id,
      authorType,
      text: commentText,
      images: commentImages,
    });
    setCommentText('');
    setCommentImages([]);
  };

  return (
    <div className="mx-auto max-w-content px-4 py-6 md:px-8 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-caption text-fg-tertiary">
          <li>
            <Link to="/projects" className="hover:text-fg">
              Projects
            </Link>
          </li>
          {project.region && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link to={`/projects?region=${encodeURIComponent(project.region)}`} className="hover:text-fg">
                  {project.region}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li className="truncate text-fg-secondary">{project.title}</li>
        </ol>
      </nav>

      {/* 1. Identity and verdict */}
      <header className="border-b border-line pb-6">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="min-w-0 font-serif text-h1 text-fg">{project.title}</h1>
          <StatusBadge project={project} />
        </div>
        <p className="mt-2 text-body text-fg-secondary">
          <i className="fas fa-location-dot mr-2 text-fg-tertiary" aria-hidden="true" />
          {project.location}
          {project.region ? `, ${project.region}` : ''}
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-10 lg:col-span-2">
          {/* 2. Build vs Spend: the fix. Full width, directly under the title. */}
          <section aria-labelledby="money-heading">
            <h2 id="money-heading" className="mb-4 text-h2 text-fg">
              Build against spend
            </h2>
            <Card padding="lg">
              <Meter health={health} variant="dual" size="lg" showSentence />

              <dl className="mt-6 grid gap-4 border-t border-line-subtle pt-5 sm:grid-cols-3">
                <div>
                  <dt className="text-overline uppercase text-fg-tertiary">Budget</dt>
                  <dd className="tabular mt-1 text-h3 text-fg">{formatMoney(health.budget, 'compact')}</dd>
                  <dd className="tabular mt-0.5 text-caption text-fg-tertiary">
                    {formatMoney(health.budget, 'full')}
                  </dd>
                </div>
                <div>
                  <dt className="text-overline uppercase text-fg-tertiary">Spent</dt>
                  <dd
                    className={`tabular mt-1 text-h3 ${health.overBudget ? 'text-over-fg' : 'text-fg'}`}
                  >
                    {formatMoney(health.spent, 'compact')}
                  </dd>
                  <dd className="tabular mt-0.5 text-caption text-fg-tertiary">
                    {formatMoney(health.spent, 'full')}
                  </dd>
                </div>
                <div>
                  <dt className="text-overline uppercase text-fg-tertiary">Remaining</dt>
                  <dd className="tabular mt-1 text-h3 text-fg">
                    {formatMoney(Math.max(health.budget - health.spent, 0), 'compact')}
                  </dd>
                  <dd className="mt-0.5 text-caption text-fg-tertiary">
                    {health.overBudget ? 'Budget exhausted' : 'Of the allocated budget'}
                  </dd>
                </div>
              </dl>

              <p className="mt-5 border-t border-line-subtle pt-4 text-caption text-fg-tertiary">
                Progress is reported by the contractor. Financial figures are derived from government
                records.
              </p>
            </Card>
          </section>

          {/* 3. Evidence outranks prose in a transparency product. */}
          <section aria-labelledby="photos-heading">
            <h2 id="photos-heading" className="mb-4 text-h2 text-fg">
              Site photos
            </h2>
            <PhotoGallery images={galleryImages} title={project.title} />
          </section>

          {/* 4. Description */}
          {project.description && (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="mb-4 text-h2 text-fg">
                About this project
              </h2>
              <p className="max-w-prose text-body-lg leading-relaxed text-fg-secondary">
                {project.description}
              </p>
            </section>
          )}

          {/* 5. Audit trail. This data already existed and was rendered nowhere. */}
          {updates.length > 0 && (
            <section aria-labelledby="updates-heading">
              <h2 id="updates-heading" className="mb-4 text-h2 text-fg">
                Update history
              </h2>
              <ol className="border-l border-line pl-5">
                {updates.map((u, i) => (
                  <li key={u.id || i} className="relative pb-6 last:pb-0">
                    <span
                      className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-canvas"
                      aria-hidden="true"
                    />
                    {/* API fields are updateDate / authorName; `date` and `author` are kept
                        as fallbacks for the optimistic objects the store creates locally. */}
                    <p className="tabular text-caption text-fg-tertiary">
                      {formatDate(u.updateDate || u.date)}
                    </p>
                    <p className="mt-1 text-body text-fg">{u.message}</p>
                    {(u.authorName || u.author) && (
                      <p className="mt-0.5 text-caption text-fg-tertiary">{u.authorName || u.author}</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* 6. Citizen reports: highest volume, so last, with a count. */}
          <section aria-labelledby="reports-heading">
            <h2 id="reports-heading" className="mb-4 text-h2 text-fg">
              Citizen reports
              <span className="tabular ml-2 text-body font-normal text-fg-tertiary">
                {projectComments.length}
              </span>
            </h2>

            <Card variant="inset" padding="lg" className="mb-8">
              <form onSubmit={submitComment}>
                <h3 className="text-h3 text-fg">Add a report</h3>
                <p className="mt-1 text-caption text-fg-tertiary">
                  If you have visited this site, tell everyone what you saw.
                </p>

                <div className="mt-5">
                  <Select label="Reporting as" value={authorType} onChange={(e) => setAuthorType(e.target.value)}>
                    <option value="Citizen">Citizen</option>
                    <option value="NGO">NGO</option>
                  </Select>
                  <p className="mt-2 text-caption text-fg-tertiary">
                    <i className="fas fa-user-shield mr-1.5" aria-hidden="true" />
                    Reports are anonymous. We do not ask for or store your name.
                  </p>
                </div>

                <Textarea
                  label="What did you observe at the site?"
                  required
                  className="mt-4"
                  fieldClassName="mt-4"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Describe what you saw, and when you were there."
                />

                {commentImages.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {commentImages.map((img, idx) => (
                      <li key={idx} className="relative h-16 w-16">
                        <img src={img} alt="" className="h-full w-full rounded-sm object-cover" />
                        <button
                          type="button"
                          onClick={() => setCommentImages((prev) => prev.filter((_, i) => i !== idx))}
                          aria-label={`Remove photo ${idx + 1}`}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger-fill text-caption text-danger-fg"
                        >
                          <i className="fas fa-xmark" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {uploadError && <p className="mt-3 text-caption text-danger">{uploadError}</p>}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label
                    className={`inline-flex items-center gap-2 text-caption font-medium ${
                      commentImages.length >= 4 ? 'text-fg-disabled' : 'cursor-pointer text-accent'
                    }`}
                  >
                    <i className="fas fa-camera" aria-hidden="true" />
                    {commentImages.length >= 4
                      ? 'Maximum of 4 photos attached'
                      : `Attach photos (${commentImages.length} of 4)`}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handleImageUpload}
                      disabled={commentImages.length >= 4}
                      className="sr-only"
                    />
                  </label>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={!commentText}
                    className="sm:w-auto"
                    fullWidth
                  >
                    Post report
                  </Button>
                </div>
              </form>
            </Card>

            {projectComments.length === 0 ? (
              <EmptyState
                icon="fa-comments"
                title="No reports yet"
                body="If you have visited this site, you can be the first to report."
              />
            ) : (
              <ol className="flex flex-col gap-6">
                {projectComments.map((comment) => {
                  const isNGO = comment.authorType === 'NGO';
                  const images = Array.isArray(comment.images) ? comment.images : [];
                  const expanded = expandedCommentId === comment.id;
                  return (
                    <li key={comment.id}>
                      <article className="border-b border-line-subtle pb-6 last:border-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {/* No initial: there is no name to take one from, and a letter
                                would imply an identity the record does not hold. */}
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                isNGO ? 'bg-planned-bg text-planned-fg' : 'bg-sunken text-fg-secondary'
                              }`}
                              aria-hidden="true"
                            >
                              <i className={isNGO ? 'fas fa-people-group' : 'fas fa-user'} />
                            </span>
                            <div>
                              <p className="text-body font-medium text-fg">
                                {/* Older reports were filed under a name, before reporting
                                    became anonymous. Those are still shown as submitted. */}
                                {comment.authorName || (isNGO ? 'Anonymous organisation' : 'Anonymous report')}
                              </p>
                              <Badge tone={isNGO ? 'planned' : 'neutral'} size="sm">
                                {comment.authorType}
                              </Badge>
                            </div>
                          </div>
                          <time
                            className="tabular shrink-0 text-caption text-fg-tertiary"
                            dateTime={comment.createdAt || comment.date}
                            title={formatDate(comment.createdAt || comment.date)}
                          >
                            {formatRelative(comment.createdAt || comment.date)}
                          </time>
                        </div>

                        <p className="mt-3 max-w-prose text-body text-fg-secondary">{comment.text}</p>

                        {images.length > 0 && (
                          <div className="mt-3">
                            {expanded ? (
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {images.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`Evidence photo ${idx + 1} attached to this report`}
                                    loading="lazy"
                                    className="aspect-photo w-full rounded-md object-cover"
                                  />
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setExpandedCommentId(null)}
                                  aria-expanded="true"
                                  className="col-span-full text-left text-caption font-medium text-accent hover:underline"
                                >
                                  Show fewer photos
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setExpandedCommentId(comment.id)}
                                aria-expanded="false"
                                className="relative block h-32 w-48 overflow-hidden rounded-md"
                              >
                                <img
                                  src={images[0]}
                                  alt="Evidence photo attached to this report"
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                                {images.length > 1 && (
                                  <span className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--overlay)/0.5)] text-body font-semibold text-white">
                                    +{images.length - 1}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        {/* Sidebar: stable facts only. The money moved to the main column. */}
        <aside className="lg:sticky lg:top-24">
          <Card padding="lg">
            <h2 className="text-h3 text-fg">Project details</h2>
            <dl className="mt-4 flex flex-col gap-3 text-body">
              <div className="flex justify-between gap-4 border-b border-line-subtle pb-3">
                <dt className="text-fg-tertiary">Contractor</dt>
                <dd className="text-right font-medium text-fg">{project.contractorName || 'Not assigned'}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-line-subtle pb-3">
                <dt className="text-fg-tertiary">Region</dt>
                <dd className="text-right text-fg">{project.region || 'Not set'}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-line-subtle pb-3">
                <dt className="text-fg-tertiary">Started</dt>
                <dd className="tabular text-right text-fg">
                  {formatDate(project.startDate || project.start_date)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-fg-tertiary">Due</dt>
                <dd className="tabular text-right text-fg">{formatDate(health.completionDate)}</dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
};

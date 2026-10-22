<template>
  <div class="panel-root">
    <p v-if="loading">Loading conversations…</p>
    <p v-else-if="error">{{ error }}</p>
    <template v-else>
      <p class="quality">
        Reviewed {{ reviewSummary.reviewed }} / {{ reviewSummary.listed }} listed exchanges. Outcome
        answered (not correctness): {{ reviewSummary.outcome_answered }}.
      </p>
      <ul>
        <li v-for="item in items" :key="item.id">
          <button type="button" @click="select(item.id)">
            {{ item.received_at }} · {{ item.outcome }} · reviewed={{ item.has_review }}
          </button>
        </li>
      </ul>
      <article v-if="detail" class="detail">
        <h3>Inspector</h3>
        <p><strong>Server reply:</strong> {{ detail.response_text ?? '—' }}</p>
        <p><strong>Browser-local fallback:</strong> {{ detail.local_fallback ?? '—' }}</p>
        <p><strong>Model:</strong> {{ detail.model ?? '—' }}</p>
        <p><strong>Delivery:</strong> {{ detail.delivery_source ?? '—' }}</p>
        <p><strong>Latency (ms):</strong> {{ detail.latency_ms ?? '—' }}</p>
        <p><strong>Provider duration (ms):</strong> {{ detail.provider_duration_ms ?? '—' }}</p>
        <p><strong>Validation duration (ms):</strong> {{ detail.validation_duration_ms ?? '—' }}</p>
        <p><strong>Validation:</strong> {{ detail.validation_status ?? '—' }}</p>
        <p><strong>Failure:</strong> {{ detail.failure_reason ?? '—' }}</p>
        <p>
          <strong>Publication:</strong>
          <a v-if="publicationLink" :href="publicationLink.href">{{ publicationLink.label }}</a>
          <span v-else>—</span>
        </p>
        <p><strong>Evidence:</strong> {{ formatJson(detail.evidence_references) }}</p>
        <p><strong>Answer cards:</strong> {{ formatJson(detail.answer_slugs) }}</p>
        <p><strong>Delivered blocks:</strong> {{ formatJson(detail.blocks) }}</p>
        <section class="review">
          <h4>Owner review</h4>
          <label v-for="tag in reviewTags" :key="tag">
            <input v-model="selectedTags" type="checkbox" :value="tag" />
            {{ tag }}
          </label>
          <textarea v-model="reviewNotes" rows="3" placeholder="Redacted notes"></textarea>
          <button type="button" @click="saveReview">Save review</button>
          <p v-if="reviewMessage">{{ reviewMessage }}</p>
        </section>
      </article>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

import { useAnalyticsFilterParams } from '../shared/analytics-filter-params.ts';

type ListItem = {
  id: string;
  received_at: string | null;
  outcome: string | null;
  has_review: boolean;
};

type Detail = {
  id: string;
  response_text: string | null;
  local_fallback: string | null;
  validation_status: string | null;
  provider_duration_ms: number | null;
  validation_duration_ms: number | null;
  failure_reason: string | null;
  evidence_references: unknown;
  publication_id: string | null;
  blocks: unknown;
  answer_slugs: unknown;
  latency_ms: number | null;
  model: string | null;
  delivery_source: string | null;
  review: { tags: string[]; notes: string | null } | null;
};

const reviewTags = [
  'unsupported_claim',
  'wrong_card',
  'incomplete',
  'irrelevant',
  'supported',
] as const;

function formatJson(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return JSON.stringify(value);
}

export default defineComponent({
  setup() {
    const api = useApi();
    const filterParams = useAnalyticsFilterParams();
    const loading = ref(true);
    const error = ref('');
    const items = ref<ListItem[]>([]);
    const detail = ref<Detail | null>(null);
    const reviewSummary = ref({ listed: 0, reviewed: 0, outcome_answered: 0 });
    const selectedTags = ref<string[]>([]);
    const reviewNotes = ref('');
    const reviewMessage = ref('');
    const publicationLink = ref<{ href: string; label: string } | null>(null);

    async function loadList() {
      loading.value = true;
      error.value = '';
      try {
        const response = await api.get('/portfolio-analytics/conversations', {
          params: { limit: 10, ...filterParams.value },
        });
        items.value = response.data.data;
        reviewSummary.value = response.data.meta.review_summary;
      } catch (caught) {
        error.value = caught instanceof Error ? caught.message : 'Failed to load conversations.';
      } finally {
        loading.value = false;
      }
    }

    async function select(id: string) {
      reviewMessage.value = '';
      publicationLink.value = null;
      const response = await api.get(`/portfolio-analytics/conversations/${id}`);
      const payload = response.data.data;
      detail.value = payload;
      selectedTags.value = payload.review?.tags ?? [];
      reviewNotes.value = payload.review?.notes ?? '';
      publicationLink.value = await loadPublicationLink(payload.publication_id);
    }

    async function loadPublicationLink(
      publicationId: string | null
    ): Promise<{ href: string; label: string } | null> {
      if (publicationId === null || publicationId === '') {
        return null;
      }
      const response = await api.get(`/items/publications/${publicationId}`, {
        params: { fields: 'id,status,date_created' },
      });
      const row = response.data.data;
      if (row === null || typeof row !== 'object') {
        return null;
      }
      const status = 'status' in row && typeof row.status === 'string' ? row.status : 'unknown';
      const created =
        'date_created' in row && typeof row.date_created === 'string' ? row.date_created : '';
      return {
        href: `/admin/content/publications/${publicationId}`,
        label: `Publication · ${status}${created === '' ? '' : ` · ${created}`}`,
      };
    }

    async function saveReview() {
      if (detail.value === null) {
        return;
      }
      reviewMessage.value = '';
      await api.put(`/portfolio-analytics/reviews/${detail.value.id}`, {
        tags: selectedTags.value,
        notes: reviewNotes.value,
      });
      reviewMessage.value = 'Review saved.';
      await loadList();
      await select(detail.value.id);
    }

    onMounted(loadList);
    watch(filterParams, loadList);

    return {
      loading,
      error,
      items,
      detail,
      reviewSummary,
      reviewTags,
      selectedTags,
      reviewNotes,
      reviewMessage,
      publicationLink,
      select,
      saveReview,
      formatJson,
    };
  },
});
</script>

<style scoped>
.panel-root {
  padding: 12px;
}
.detail {
  margin-top: 12px;
  border-top: 1px solid var(--theme--border-color-subdued);
  padding-top: 12px;
}
.review {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}
.quality {
  margin-bottom: 8px;
}
button {
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
}
</style>

/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import ValidationCenter from './ValidationCenter';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children }) => children,
    NavLink: ({ children }) => children,
    useNavigate: () => jest.fn(),
  }),
  { virtual: true }
);

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('../../utils/authContext', () => ({
  getAuthenticatedContext: jest.fn(),
}));

test('shows planned studies and does not label coverage as connector accuracy', async () => {
  getAuthenticatedContext.mockResolvedValue({
    user: { name: 'Admin', role: 'admin' },
    orgId: 'org-1',
    teamId: 'team-1',
  });
  api.get.mockResolvedValue({
    data: {
      coverage: {
        connectedSources: 1,
        sourcesWithMeasuredCoverage: 1,
        sources: [
          {
            type: 'microsoft-outlook',
            mappedUsers: 41,
            totalUsers: 93,
            mappingCoveragePct: 44,
            reconciliationStatus: 'not_run',
          },
        ],
      },
      outcomes: {
        totalActions: 0,
        activeActions: 0,
        measuredActions: 0,
        acknowledgedMeasuredActions: 0,
        improvedActions: 0,
        notImprovedActions: 0,
      },
      evidence: {
        verifiedRecords: 0,
        organizationRecords: 0,
        productRecords: 0,
        recent: [],
      },
      independentOutcomes: { records: 0, families: [], sources: [] },
      studies: [
        {
          key: 'connector_accuracy',
          order: 1,
          phase: 'Prove the data',
          title: 'Connector accuracy and reconciliation',
          question: 'Do records agree?',
          output: 'Missing and duplicate record results.',
          clientValue: 'Shows whether imported records are dependable.',
          signalTrueValue: 'Finds adapter defects.',
          status: 'planned',
          protocolVersion: 'draft',
          verifiedEvidenceCount: 0,
          organizationEvidenceCount: 0,
        },
      ],
      metrics: [],
    },
  });

  render(<ValidationCenter />);

  expect(await screen.findByText('Connector accuracy and reconciliation')).toBeInTheDocument();
  expect(screen.getByText('Reconciliation not run')).toBeInTheDocument();
  expect(screen.getByText(/No verified study result is available yet/)).toBeInTheDocument();
  expect(screen.getByText('Planned')).toBeInTheDocument();
});

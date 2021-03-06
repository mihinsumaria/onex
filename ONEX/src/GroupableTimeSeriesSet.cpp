#include "GroupableTimeSeriesSet.h"

GroupableTimeSeriesSet::GroupableTimeSeriesSet(TimeSeriesSet *dataset,
                                               TimeSeriesSetGrouping *grouping)
{
    this->dataset = dataset;
    this->grouping = grouping;
}

GroupableTimeSeriesSet::GroupableTimeSeriesSet(const GroupableTimeSeriesSet &other)
{

    this->dataset = NULL;
    this->grouping = NULL;

    if (other.dataset != NULL)
        this->dataset = new TimeSeriesSet(*other.dataset);

    if (other.grouping != NULL)
        this->grouping = new TimeSeriesSetGrouping(*other.grouping);
}

GroupableTimeSeriesSet::~GroupableTimeSeriesSet(void)
{
    if (dataset != NULL)
        delete dataset;

    if (grouping != NULL)
        delete grouping;
}

TimeSeriesSetGrouping* GroupableTimeSeriesSet::getGrouping(){
  return grouping;
}

int GroupableTimeSeriesSet::getSeqCount(void)
{
    return dataset->getSeqCount();
}

int GroupableTimeSeriesSet::getSeqLength(void)
{
    return dataset->getSeqLength();
}

void GroupableTimeSeriesSet::resetDB(void)
{
    resetGrouping();

    if (dataset != NULL)
        delete dataset;

    dataset = NULL;
}

bool GroupableTimeSeriesSet::valid(void)
{
    if (dataset == NULL)
        return false;

    return dataset->valid();
}

int GroupableTimeSeriesSet::dbFromFile(const char *path)
{
    resetDB();

    dataset = new TimeSeriesSet(path);

    if (!dataset->valid()) {
        cerr << "Warning: Failed to read file. Dataset not added." << endl;
        delete dataset;
        dataset = NULL;
    }

    return (valid())? 0 : -1;
}

int GroupableTimeSeriesSet::dbToFile(const char *path)
{
    if (!valid()) {
        cerr << "Warning: Attempted to save invalid dataset." << endl;
        return -1;
    }

    return dataset->toFile(path);
}

int GroupableTimeSeriesSet::odbFromFile(const char *path, int seqCount, int seqLength, int del)
{
    resetDB();

    dataset = new TimeSeriesSet(path, seqCount, seqLength, del);

    if (!dataset->valid()) {
        cerr << "Warning: Failed to read file. Dataset not added." << endl;
        delete dataset;
        dataset = NULL;
    }

    return (valid())? 0 : -1;
}

int GroupableTimeSeriesSet::odbToFile(const char *path)
{
    cerr << "Warning: Saving to old file format is temporarily disabled." << endl;

    return -1;
}

int GroupableTimeSeriesSet::groupsToFile(const char *path)
{
    if (!validGrouping()) {
        cerr << "Warning: Attempted to save grouping before generating groups." << endl;
        return -1;
    }

    return grouping->toFile(path);
}

int GroupableTimeSeriesSet::groupsFromFile(const char *path)
{
    if (!valid()) {
        cerr << "Warning: Attempted to load groups for invalid dataset." << endl;
        return -1;
    }

    if (grouping != NULL) {
        resetGrouping();
    }

    grouping = new TimeSeriesSetGrouping(dataset);

    int res = grouping->fromFile(path);
    if (res == 0)
        grouping->genEnvelopes();

    return res;
}

pair<seqitem_t, seqitem_t> GroupableTimeSeriesSet::normalize(void)
{
    return dataset->normalize();
}

int GroupableTimeSeriesSet::genGrouping(seqitem_t ST)
{
    if (!valid()) {
        cerr << "Warning: Attempted to group invalid dataset." << endl;
        return -1;
    }

    resetGrouping();

    grouping = new TimeSeriesSetGrouping(dataset, ST);
    int cntGroups = grouping->group();
    grouping->genEnvelopes();
    return cntGroups;
}

void GroupableTimeSeriesSet::resetGrouping(void)
{
    if (grouping != NULL)
        delete grouping;

    grouping = NULL;
}

bool GroupableTimeSeriesSet::validGrouping(void)
{
    return grouping != NULL;
}

seqitem_t GroupableTimeSeriesSet::distance(int seq, TimeInterval interval,
                                      GroupableTimeSeriesSet *other, int otherSeq, TimeInterval otherInt,
                                      SeriesDistanceMetric *metric)
{
    if (!valid() || !other->valid()) {
        cerr << "Warning: Attempted to test distance from invalid dataset." << endl;
        return -1;
    }

    TimeSeriesInterval a = dataset->getInterval(seq, interval);
    TimeSeriesInterval b = other->dataset->getInterval(otherSeq, otherInt);

    seqitem_t dist = metric->run(a, b, INF);

    return dist;
}

warping_path_t GroupableTimeSeriesSet::warping_path(int seq, TimeInterval interval,
                                      GroupableTimeSeriesSet *other, int otherSeq, TimeInterval otherInt,
                                      SeriesDistanceMetric *metric)
{
    TimeSeriesInterval a = dataset->getInterval(seq, interval);
    TimeSeriesInterval b = other->dataset->getInterval(otherSeq, otherInt);
    warping_path_t path = metric->getWarpingPath(a, b);
    return path;
}

vector< vector<kBest> > GroupableTimeSeriesSet::seasonalSimilarity(int TSIndex, int length)
{
    if (length < 1 || length > dataset->getSeqLength()) {
        cerr << "Warning: Given invalid length: " << length << "." << endl;
        return vector<vector<kBest>>();
    }
    if (grouping == NULL) {
        cerr << "Warning: Attempted to find seasonal similarity on ungrouped dataset." << endl;
        return vector<vector<kBest>>();
    }
    return grouping->getGroup(length-1)->getSeasonal(TSIndex);
}

kBest GroupableTimeSeriesSet::similar(GroupableTimeSeriesSet *other, int otherSeq, TimeInterval otherInt,
                                     SearchStrategy strat, int warps)
{
    kBest best;
    best.seq = -1;
    if (!valid() || !other->valid()) {
        cerr << "Warning: Attempted to find similarities using an invalid database." << endl;
        return best;
    }

    if (grouping == NULL) {
        cerr << "Warning: Attempted to find similarities on ungrouped dataset." << endl;
        return best;
    }

//#ifdef FIND_DISTINCT
    best = grouping->getBestDistinctInterval(otherInt.length(),
                                           other->dataset->getRawData(otherSeq, otherInt.start),
                                           strat, warps, otherSeq);
// //#else
    // printf("Running non distinct\n");
    // best = grouping->getBestInterval(otherInt.length(),
    //                                    other->dataset->getRawData(otherSeq, otherInt.start),
    //                                    strat, warps);
// #endif

    return best;
}

void GroupableTimeSeriesSet::outlier(int length)
{
    cerr << "Warning: Outlier search not yet implemented." << endl;
}

void GroupableTimeSeriesSet::printdb(void)
{
    if (!valid()) {
        cerr << "Warning: Attempted to print invalid dataset." << endl;
        return;
    }

    dataset->printData(cout);
}

void GroupableTimeSeriesSet::descdb(void)
{
    if (!valid()) {
        cerr << "Warning: Attempted to describe invalid dataset." << endl;
        return;
    }

    dataset->printDesc(cout);
}

void GroupableTimeSeriesSet::printint(int seq, TimeInterval interval)
{
    if (!valid()) {
        cerr << "Warning: Attempted to print interval from invalid dataset." << endl;
        return;
    }

    dataset->printInterval(cout, seq, interval);
}

TimeSeriesInterval GroupableTimeSeriesSet::getinterval(int seq, TimeInterval interval)
{
    return dataset->getInterval(seq, interval);
}

const char *GroupableTimeSeriesSet::getName(void)
{
    if (!valid()) {
        cerr << "Warning: Attempted to get name of invalid dataset." << endl;
        return "<ERROR>";
    }

    return dataset->getName();
}

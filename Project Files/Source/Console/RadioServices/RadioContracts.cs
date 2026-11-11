using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;

namespace Thetis.RadioServices
{
    public static class RadioWire
    {
        public const int SchemaVersion = 1;
        public const long MaxSafeInteger = 9007199254740991;
        public static string Serialize(object value) => JsonConvert.SerializeObject(value, new JsonSerializerSettings {
            ContractResolver = new CamelCasePropertyNamesContractResolver(), MaxDepth = 32
        });
    }

    public sealed class ReceiverState
    {
        public string Id { get; }
        public long? VfoAHz { get; }
        public long? VfoBHz { get; }
        public ReceiverState(string id, long? vfoAHz, long? vfoBHz) { Id = id; VfoAHz = vfoAHz; VfoBHz = vfoBHz; }
    }

    public sealed class RadioSnapshot
    {
        public int SchemaVersion => RadioWire.SchemaVersion;
        public string SessionGeneration { get; }
        public long Revision { get; }
        public string Lifecycle { get; }
        public IReadOnlyList<ReceiverState> Receivers { get; }
        public IReadOnlyList<string> Capabilities { get; }
        public string Fault { get; }
        public RadioSnapshot(string sessionGeneration, long revision, string lifecycle,
            IEnumerable<ReceiverState> receivers, IEnumerable<string> capabilities, string fault = null)
        {
            SessionGeneration = sessionGeneration; Revision = revision; Lifecycle = lifecycle;
            Receivers = new ReadOnlyCollection<ReceiverState>((receivers ?? Array.Empty<ReceiverState>()).ToArray());
            Capabilities = new ReadOnlyCollection<string>((capabilities ?? Array.Empty<string>()).ToArray()); Fault = fault;
        }
    }

    public sealed class RadioCommand
    {
        private readonly JObject payload;
        public string RequestId { get; }
        public string SessionGeneration { get; }
        public string ConnectionId { get; }
        public long Sequence { get; }
        public string Operation { get; }
        public string Target { get; }
        public JObject Payload => (JObject)payload.DeepClone();
        public long? ExpectedRevision { get; }
        public RadioCommand(string requestId, string sessionGeneration, string connectionId, long sequence,
            string operation, string target, JObject payload, long? expectedRevision = null)
        {
            RequestId = requestId; SessionGeneration = sessionGeneration; ConnectionId = connectionId;
            Sequence = sequence; Operation = operation; Target = target;
            this.payload = (JObject)(payload ?? new JObject()).DeepClone(); ExpectedRevision = expectedRevision;
        }
        internal bool SameAs(RadioCommand other) => RequestId == other.RequestId && Operation == other.Operation &&
            Target == other.Target && ExpectedRevision == other.ExpectedRevision && JToken.DeepEquals(payload, other.payload);
    }

    public sealed class RadioError
    {
        public string Code { get; }
        public string Message { get; }
        public RadioError(string code, string message) { Code = code; Message = message; }
    }
    public sealed class CommandResult
    {
        public int SchemaVersion => RadioWire.SchemaVersion;
        public string RequestId { get; }
        public string SessionGeneration { get; }
        public string ConnectionId { get; }
        public long Sequence { get; }
        public bool Accepted => Error == null;
        public long Revision { get; }
        public RadioError Error { get; }
        internal CommandResult(RadioCommand command, RadioSnapshot snapshot, RadioError error = null)
        {
            RequestId = command?.RequestId; SessionGeneration = snapshot.SessionGeneration;
            ConnectionId = command?.ConnectionId; Sequence = command?.Sequence ?? 0; Revision = snapshot.Revision; Error = error;
        }
    }

    public sealed class RadioMutation
    {
        public IReadOnlyList<ReceiverState> Receivers { get; }
        public RadioMutation(IEnumerable<ReceiverState> receivers) {
            Receivers = new ReadOnlyCollection<ReceiverState>(receivers.ToArray());
        }
    }
    public interface IRadioCommandTarget
    {
        Task<RadioMutation> ApplyAsync(RadioCommand command, RadioSnapshot current, CancellationToken cancellationToken);
    }
}

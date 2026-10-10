package logic

import (
	"context"
	"errors"
	"testing"

	"baiyun/apps/social/rpc/internal/svc"
	"baiyun/apps/social/rpc/models"
	"baiyun/apps/social/rpc/social"
	"baiyun/apps/user/rpc/user"
	"baiyun/apps/user/rpc/userclient"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type friendModelStub struct {
	models.FriendModel
	relations   map[[2]int64]bool
	deleteErr   error
	deleteCalls int
}

func (m *friendModelStub) FindOneByUserIdFriendUserId(_ context.Context, userID, friendID int64) (*models.Friend, error) {
	if m.relations[[2]int64{userID, friendID}] {
		return &models.Friend{UserId: userID, FriendUserId: friendID}, nil
	}
	return nil, models.ErrNotFound
}

func (m *friendModelStub) DeleteByUserID(_ context.Context, userID, friendID int64) (bool, error) {
	m.deleteCalls++
	if m.deleteErr != nil {
		return false, m.deleteErr
	}
	pair := [2]int64{userID, friendID}
	exists := m.relations[pair]
	delete(m.relations, pair)
	return exists, nil
}

type userClientStub struct{ userclient.User }

func (m *userClientStub) GetUser(_ context.Context, in *userclient.GetUserRequest, _ ...grpc.CallOption) (*user.GetUserResponse, error) {
	return &user.GetUserResponse{Id: in.Id, Name: "test"}, nil
}

type requestModelStub struct {
	models.FriendRequestModel
	record         models.FriendRequest
	findCalls      int
	reopenCalls    int
	reopened       bool
	expectedStatus int64
}

func (m *requestModelStub) FindOneByFromUserIdToUserId(_ context.Context, _, _ int64) (*models.FriendRequest, error) {
	m.findCalls++
	return &m.record, nil
}
func (m *requestModelStub) Reopen(_ context.Context, id, expectedStatus int64, message string) (bool, error) {
	m.reopenCalls++
	m.expectedStatus = expectedStatus
	if id != m.record.Id || expectedStatus != m.record.Status || !m.reopened {
		return false, nil
	}
	m.record.Status = 0
	m.record.Message = message
	return true, nil
}

func TestDeleteFriendOnlyRemovesCallerDirection(t *testing.T) {
	m := &friendModelStub{relations: map[[2]int64]bool{{16, 17}: true, {17, 16}: true}}
	l := NewDeleteFriendLogic(context.Background(), &svc.ServiceContext{FriendModel: m})
	resp, err := l.DeleteFriend(&social.DeleteFriendRequest{UserId: 16, FriendUserId: 17})
	if err != nil || resp.GetFriendUserId() != 17 {
		t.Fatalf("unexpected result: %v %v", resp, err)
	}
	if m.relations[[2]int64{16, 17}] || !m.relations[[2]int64{17, 16}] {
		t.Fatal("delete changed the wrong direction")
	}
	_, err = l.DeleteFriend(&social.DeleteFriendRequest{UserId: 16, FriendUserId: 17})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("repeat delete: %v", err)
	}
	for _, req := range []*social.DeleteFriendRequest{{UserId: 0, FriendUserId: 17}, {UserId: 16, FriendUserId: 16}} {
		calls := m.deleteCalls
		_, err = l.DeleteFriend(req)
		if status.Code(err) != codes.InvalidArgument || m.deleteCalls != calls {
			t.Fatalf("invalid input reached model: %v", err)
		}
	}
	m.deleteErr = errors.New("database failed")
	_, err = l.DeleteFriend(&social.DeleteFriendRequest{UserId: 16, FriendUserId: 17})
	if status.Code(err) != codes.Internal {
		t.Fatalf("database error: %v", err)
	}
}

func TestApplyFriendChecksCurrentDirectionAndReopens(t *testing.T) {
	for _, tc := range []struct {
		name        string
		ownRelation bool
		oldStatus   int64
		reopened    bool
		want        codes.Code
	}{
		{"reverse request from existing friend", true, 1, true, codes.AlreadyExists},
		{"deleted caller can reapply", false, 1, true, codes.OK},
		{"rejected caller can reapply", false, 2, true, codes.OK},
		{"pending request stays pending", false, 0, true, codes.AlreadyExists},
		{"concurrent status change", false, 1, false, codes.Aborted},
	} {
		t.Run(tc.name, func(t *testing.T) {
			friends := &friendModelStub{relations: map[[2]int64]bool{{16, 17}: true, {17, 16}: tc.ownRelation}}
			requests := &requestModelStub{record: models.FriendRequest{Id: 9, Status: tc.oldStatus}, reopened: tc.reopened}
			l := NewApplyFriendLogic(context.Background(), &svc.ServiceContext{FriendModel: friends, FriendRequestModel: requests, UserRpc: &userClientStub{}})
			resp, err := l.ApplyFriend(&social.ApplyFriendRequest{FromUserId: 17, ToUserId: 16, Message: " hello "})
			if status.Code(err) != tc.want {
				t.Fatalf("want %v, got %v", tc.want, err)
			}
			if tc.ownRelation && requests.findCalls != 0 {
				t.Fatal("existing friend reached request lookup")
			}
			if tc.want == codes.OK && (resp.GetId() != 9 || requests.record.Status != 0 || requests.record.Message != "hello" || requests.expectedStatus != tc.oldStatus) {
				t.Fatal("reopen did not preserve request identity and expected status")
			}
			if tc.oldStatus == 0 && requests.reopenCalls != 0 {
				t.Fatal("pending application was reopened")
			}
		})
	}
}
